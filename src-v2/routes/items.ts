// src/routes/items.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { uploadItemImages } from '../middleware/upload';
import dayjs from 'dayjs';
import { calculateExpiryDate } from '../utils/dateUtils';
import { calculateDistance } from '../utils/distance';

const router = express.Router();
const prisma = new PrismaClient();

// Get all items with images
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const {
      categoryId,
      name,
      sortBy = 'latest',
      maxDistance = '50', // Default 50km
      lat, // User's current latitude (optional)
      lng, // User's current longitude (optional)
      search, // General search term (name or description)
    } = req.query as {
      categoryId?: string;
      name?: string;
      sortBy?: 'latest' | 'nearest' | 'expiring';
      maxDistance?: string;
      lat?: string;
      lng?: string;
      search?: string;
    };

    // Get user's location from database or query params
    let userLat: number | null = null;
    let userLng: number | null = null;
    let userAddress: string | null = null;

    // Priority: 1. Query params, 2. User's saved location, 3. None
    if (lat && lng) {
      userLat = parseFloat(lat);
      userLng = parseFloat(lng);
    } else {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { location: true },
      });

      if (user?.location) {
        try {
          const location = JSON.parse(user.location);
          userLat = location.latitude;
          userLng = location.longitude;
          userAddress = location.address;
        } catch (error) {
          console.error('Error parsing user location:', error);
        }
      }
    }

    // Build the where clause dynamically
    const whereClause: any = {
      expiry: {
        gte: dayjs().startOf('day').toDate(),
      },
      quantity: {
        gt: 0, // Changed from gte to gt to exclude 0 quantity items
      },
      userId: {
        not: req.user?.userId, // Exclude user's own items
      },
    };

    // Add category filter if provided
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Add search filter (search in name OR description)
    if (search || name) {
      const searchTerm = search || name;
      whereClause.OR = [
        {
          name: {
            contains: searchTerm,
          },
        },
        {
          description: {
            contains: searchTerm,
          },
        },
      ];
    }

    // Fetch items with all necessary data
    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            imageUrl: true,
          },
        },
        images: {
          select: { id: true, imageUrl: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1, // Get only first image for listing
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        condition: {
          select: {
            name: true,
          },
        },
        likedBy: {
          where: { userId: req.user?.userId },
          select: { id: true, userId: true },
        },
        _count: {
          select: {
            likedBy: true,
            requests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // Default order
    });

    // Parse item locations and calculate distances
    const itemsWithLocation = items.map((item) => {
      let location = null;
      try {
        location = JSON.parse(item.location);
      } catch (error) {
        location = { latitude: 0, longitude: 0 };
      }

      // Calculate distance if user location is available
      let distance: number | null = null;
      let distanceText: string | null = null;

      if (userLat && userLng && location?.latitude && location?.longitude) {
        distance = calculateDistance(
          { latitude: userLat, longitude: userLng },
          { latitude: location.latitude, longitude: location.longitude },
        );

        // Format distance
        if (distance < 1) {
          distanceText = `${Math.round(distance * 1000)}m`;
        } else {
          distanceText = `${distance.toFixed(1)}km`;
        }
      }

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        expiry: item.expiry,
        location,
        locationDescription: item.locationDescription,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        userId: item.userId,
        categoryId: item.categoryId,
        conditionId: item.conditionId,
        user: item.user,
        category: item.category,
        condition: item.condition,
        images: item.images.map((img) => ({
          ...img,
          imageUrl: `${process.env.SERVER_URL}${img.imageUrl}`,
        })),
        likedBy: item.likedBy,
        likeCount: item._count.likedBy,
        pendingRequestCount: item._count.requests,
        isLiked: item.likedBy.length > 0,
        distance,
        distanceText,
        expiresInDays: dayjs(item.expiry).diff(dayjs(), 'day'),
        isExpiringSoon: dayjs(item.expiry).diff(dayjs(), 'day') <= 2,
      };
    });

    // Apply distance filter if maxDistance is provided and user has location
    let filteredItems = itemsWithLocation;
    if (userLat && userLng && maxDistance) {
      const maxDistanceNum = parseFloat(maxDistance);
      filteredItems = itemsWithLocation.filter((item) => {
        return item.distance === null || item.distance <= maxDistanceNum;
      });
    }

    // Apply sorting
    let sortedItems = filteredItems;
    switch (sortBy) {
      case 'nearest':
        if (userLat && userLng) {
          sortedItems = [...filteredItems].sort((a, b) => {
            // Items with no distance go last
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
        }
        break;

      case 'expiring':
        sortedItems = [...filteredItems].sort((a, b) => {
          return a.expiresInDays - b.expiresInDays;
        });
        break;

      case 'latest':
      default:
        sortedItems = [...filteredItems].sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        break;
    }

    res.json(sortedItems);
  } catch (error) {
    next(error);
  }
});

// routes/trending-items.ts (Simplified)
router.get('/trending', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.userId;

    // Get top 5 most liked items overall
    const trendingItems = await prisma.item.findMany({
      where: {
        expiry: {
          gte: dayjs().startOf('day').toDate(), // Not expired
        },
        quantity: {
          gt: 0, // Has available quantity
        },
        userId: {
          not: userId, // Exclude user's own items
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        images: {
          select: { id: true, imageUrl: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1, // Get only first image
        },
        category: {
          select: { id: true, name: true },
        },
        likedBy: {
          where: { userId }, // Check if current user liked this item
          select: { id: true, userId: true },
        },
        _count: {
          select: {
            likedBy: true, // Count all likes
            requests: {
              where: { status: 'PENDING' },
            },
          },
        },
      },
      orderBy: {
        likedBy: {
          _count: 'desc', // Order by total number of likes
        },
      },
      take: 5, // Only get top 5 items
    });

    // Format response
    const formattedItems = trendingItems.map((item) => {
      let location = null;
      try {
        location = JSON.parse(item.location);
      } catch (error) {
        location = { latitude: 0, longitude: 0 };
      }

      // Calculate trending rank (1-5)
      const rank = trendingItems.findIndex((i) => i.id === item.id) + 1;

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        expiry: item.expiry,
        location,
        locationDescription: item.locationDescription,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        user: item.user,
        category: item.category,
        images: item.images.map((img) => ({
          ...img,
          imageUrl: `${process.env.SERVER_URL}${img.imageUrl}`,
        })),
        likeCount: item._count.likedBy,
        pendingRequestCount: item._count.requests,
        isLiked: item.likedBy.length > 0,
        trendingRank: rank,
      };
    });

    res.json(formattedItems);
  } catch (error) {
    next(error);
  }
});

router.get('/mine', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;

    const items = await prisma.item.findMany({
      where: {
        userId: userId,
      },
      include: {
        // Include necessary relations
        category: {
          select: { name: true },
        },
        images: {
          select: { imageUrl: true },
          take: 1, // Get first image only
        },
        _count: {
          select: {
            likedBy: true,
            requests: {
              where: { status: 'PENDING' },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!items.length) {
      return res.sendStatus(404);
    }

    const formated = items.map((item) => ({
      ...item,
      images: item.images.map((img) => ({
        ...img,
        imageUrl: `${process.env.SERVER_URL}${img.imageUrl}`,
      })),
      location: JSON.parse(item.location),
      likeCount: item._count.likedBy,
      pendingRequestCount: item._count.requests,
    }));

    res.json(formated);
  } catch (error) {
    next(error);
  }
});

// Create item with multiple images
router.post('/', uploadItemImages, async (req: AuthRequest, res, next) => {
  // uploadItemImages(req, res, async (err) => {
  // });
  try {
    // if (err) {
    //   if (err instanceof multer.MulterError) {
    //     if (err.code === 'LIMIT_FILE_SIZE') {
    //       return res
    //         .status(400)
    //         .json({ error: 'File size too large. Maximum 5MB per image.' });
    //     }
    //     if (err.code === 'LIMIT_FILE_COUNT') {
    //       return res
    //         .status(400)
    //         .json({ error: 'Too many files. Maximum 5 images allowed.' });
    //     }
    //     if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    //       return res
    //         .status(400)
    //         .json({ error: 'Unexpected field. Use "images" as field name.' });
    //     }
    //   }
    //   return res.status(400).json({ error: err.message });
    // }

    const {
      name,
      categoryId,
      quantity,
      expiry,
      conditionId,
      description,
      location,
      locationDescription,
    } = req.body;

    // Create item with transaction to ensure data consistency
    const item = await prisma.$transaction(async (tx) => {
      // Create the item
      const newItem = await tx.item.create({
        data: {
          name,
          categoryId,
          quantity: +quantity,
          conditionId,
          description,
          location,
          locationDescription,
          expiry: calculateExpiryDate(expiry),
          userId: req.user!.userId,
        },
      });

      // Create image records if files were uploaded
      if (req.files?.length && Array.isArray(req.files)) {
        const imageData = req.files.map((file: Express.Multer.File) => ({
          imageUrl: `/uploads/${file.filename}`,
          itemId: newItem.id,
        }));

        await tx.itemImage.createMany({
          data: imageData,
        });
      }

      // Return the complete item with relations
      return await tx.item.findUnique({
        where: { id: newItem.id },
        include: {
          images: {
            select: { id: true, imageUrl: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    res.json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    next(error);
  }
});

// Get single item with images
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { location: true },
    });

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        images: {
          select: { id: true, imageUrl: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        likedBy: {
          where: { userId: req.user?.userId },
          select: { id: true, userId: true },
        },
        category: {
          select: { name: true },
        },
        _count: {
          select: {
            likedBy: true,
            requests: true,
          },
        },
        requests: {
          include: {
            requester: {
              select: { id: true, name: true, email: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Parse item location & calculate distance
    let location = null;
    let userLoc = null;
    try {
      location = JSON.parse(item.location);
      userLoc = JSON.parse(user?.location ?? '');
    } catch (error) {
      location = { latitude: 0, longitude: 0 };
      userLoc = { latitude: 0, longitude: 0 };
    }

    // Calculate distance if user location is available
    let distance: number | null = null;
    let distanceText: string | null = null;

    if (userLoc && location) {
      distance = calculateDistance(
        { latitude: userLoc.latitude, longitude: userLoc.longitude },
        { latitude: location.latitude, longitude: location.longitude },
      );

      // Format distance
      if (distance < 1) {
        distanceText = `${Math.round(distance * 1000)}m`;
      } else {
        distanceText = `${distance.toFixed(1)}km`;
      }
    }

    res.json({
      ...item,
      location: userLoc,
      images: item.images.map((img) => ({
        ...img,
        imageUrl: `${process.env.SERVER_URL}${img.imageUrl}`,
      })),
      isLiked: item.likedBy.length > 0,
      distance,
      distanceText,
    });
  } catch (error) {
    next(error);
  }
});

// Update item (with optional image updates)
router.put('/:id', uploadItemImages, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      quantity,
      condition,
      description,
      location,
      locationDescription,
      expiry,
    } = req.body;

    // Check if item exists and user owns it
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        userId: req.user!.userId,
      },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // Update item details
      const item = await tx.item.update({
        where: { id },
        data: {
          name,
          category,
          quantity: +quantity,
          condition,
          description,
          location,
          locationDescription,
          expiry: calculateExpiryDate(expiry),
        },
      });

      // Add new images if any were uploaded
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const imageData = req.files.map((file: Express.Multer.File) => ({
          imageUrl: `/uploads/${file.filename}`,
          itemId: id,
        }));

        await tx.itemImage.createMany({
          data: imageData,
        });
      }

      // Return updated item with relations
      return await tx.item.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          images: {
            select: { id: true, imageUrl: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
          likedBy: {
            where: { userId: req.user?.userId },
            select: { id: true },
          },
          _count: {
            select: {
              likedBy: true,
              requests: true,
            },
          },
        },
      });
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    next(error);
  }
});

// Delete item image
router.delete(
  '/:itemId/images/:imageId',
  async (req: AuthRequest, res, next) => {
    try {
      const { itemId, imageId } = req.params;

      // Check if item exists and user owns it
      const item = await prisma.item.findFirst({
        where: {
          id: itemId,
          userId: req.user!.userId,
        },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Delete the image
      await prisma.itemImage.delete({
        where: {
          id: imageId,
          itemId: itemId,
        },
      });

      res.json({ message: 'Image deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// Like/unlike item (keep existing)
router.post('/:id/like', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existingLike = await prisma.likedItem.findFirst({
      where: { userId, itemId: id },
    });

    if (existingLike) {
      await prisma.likedItem.delete({
        where: { id: existingLike.id },
      });
      res.json({ message: 'Item unliked', liked: false });
    } else {
      const likedItem = await prisma.likedItem.create({
        data: {
          userId,
          itemId: id,
        },
      });
      res.json({ message: 'Item liked', liked: true, likedItem });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
