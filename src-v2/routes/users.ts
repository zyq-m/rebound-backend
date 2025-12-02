// src/routes/users.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { requireAdmin } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

const router = express.Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        imageUrl: true,
        location: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const formatedUser: typeof user = {
      ...user,
      imageUrl: user.imageUrl
        ? `${process.env.SERVER_URL}${user.imageUrl}`
        : null,
      location: user.location ? JSON.parse(user.location) : null,
    };

    res.json(formatedUser);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const { name, phone, location } = req.body;

    const dataClause: any = {};

    if (name) dataClause.name = name;
    if (phone) dataClause.phone = phone;
    if (location) dataClause.location = location;

    console.log(location);
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: dataClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        imageUrl: true,
        location: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const formatedUser: typeof updatedUser = {
      ...updatedUser,
      imageUrl: updatedUser.imageUrl
        ? `${process.env.SERVER_URL}${updatedUser.imageUrl}`
        : null,
      location: updatedUser.location ? JSON.parse(updatedUser.location) : null,
    };

    res.json({
      message: 'Profile updated successfully',
      user: formatedUser,
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/change-password', async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user's items
router.get('/my-items', async (req: AuthRequest, res, next) => {
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

    const formated = items.map((item) => ({
      ...item,
      images: item.images.map((img) => ({
        ...img,
        imageUrl: `http://192.168.0.3:3000${img.imageUrl}`,
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

// Get user's liked items
router.get('/liked-items', async (req: AuthRequest, res, next) => {
  try {
    const likedItems = await prisma.likedItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        item: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
            images: {
              select: { id: true, imageUrl: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
            likedBy: {
              where: { userId: req.user!.userId },
              select: { id: true },
            },
            _count: {
              select: {
                likedBy: true,
                requests: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    res.json(likedItems);
  } catch (error) {
    next(error);
  }
});

// Get user's food requests (sent)
router.get('/my-requests', async (req: AuthRequest, res, next) => {
  try {
    const requests = await prisma.itemRequest.findMany({
      where: { requesterId: req.user!.userId },
      include: {
        item: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        provider: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get requests for user's items (received)
router.get('/received-requests', async (req: AuthRequest, res, next) => {
  try {
    const requests = await prisma.itemRequest.findMany({
      where: {
        providerId: req.user!.userId,
        item: { userId: req.user!.userId },
      },
      include: {
        item: {
          include: {
            images: true,
            user: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true, phone: true },
        },
        provider: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requestedItems = requests.map((it) => ({
      ...it,
      item: {
        ...it.item,
        images: it.item.images.map((img) => ({
          ...img,
          imageUrl: `${process.env.SERVER_URL}${img.imageUrl}`,
        })),
      },
    }));

    res.json(requestedItems);
  } catch (error) {
    next(error);
  }
});

// Update request status (approve/reject)
router.put('/requests/:requestId', async (req: AuthRequest, res, next) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if request exists and user owns the item
    const existingRequest = await prisma.itemRequest.findFirst({
      where: {
        id: requestId,
        providerId: req.user!.userId,
      },
      include: { item: true },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const updatedRequest = await prisma.itemRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        item: true,
        requester: {
          select: { id: true, name: true, email: true, phone: true },
        },
        provider: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    // If request is approved or completed, mark item as unavailable
    if (status === 'APPROVED' || status === 'COMPLETED') {
      await prisma.item.update({
        where: { id: existingRequest.itemId },
        data: {
          quantity: {
            decrement: existingRequest.quantity,
          },
        },
      });
    }

    res.json({
      message: `Request ${status.toLowerCase()} successfully`,
      request: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
});

// ADMIN ROUTES

// Get all users (Admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            items: true,
            sentRequests: true,
            receivedRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Suspend/unsuspend user (Admin only)
router.put(
  '/:userId/suspend',
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      const { userId } = req.params;
      const { suspend } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent admin from suspending themselves
      if (userId === req.user!.userId) {
        return res
          .status(400)
          .json({ error: 'Cannot suspend your own account' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isSuspended: suspend },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isSuspended: true,
          createdAt: true,
        },
      });

      res.json({
        message: `User ${suspend ? 'suspended' : 'activated'} successfully`,
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get data reports (Admin only)
router.get(
  '/reports/dashboard',
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      const [
        totalUsers,
        totalItems,
        totalRequests,
        activeItems,
        completedRequests,
        suspendedUsers,
        recentUsers,
        popularCategories,
      ] = await Promise.all([
        // Total users count
        prisma.user.count(),

        // Total items count
        prisma.item.count(),

        // Total requests count
        prisma.itemRequest.count(),

        // Active available items count
        prisma.item.count({
          where: {
            expiry: {
              gte: dayjs().startOf('day').toDate(),
            },
          },
        }),

        // Completed requests count
        prisma.itemRequest.count({ where: { status: 'COMPLETED' } }),

        // Suspended users count
        prisma.user.count({ where: { isSuspended: true } }),

        // Recent users (last 7 days)
        prisma.user.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),

        // Popular categories
        prisma.item.groupBy({
          by: ['categoryId'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
      ]);

      res.json({
        overview: {
          totalUsers,
          totalItems,
          totalRequests,
          activeItems,
          completedRequests,
          suspendedUsers,
        },
        recentUsers,
        popularCategories,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete user (Admin only)
router.delete('/:userId', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
