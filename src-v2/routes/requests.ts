// src/routes/requests.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Request food item
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const {
      itemId,
      message = 'Hello! I would be grateful to receive this item. Please let me know when I can come by to pick it up. Thank you for sharing!',
      quantity,
    } = req.body;
    const userId = req.user!.userId;

    const request = await prisma.itemRequest.create({
      data: {
        itemId,
        quantity,
        message,
        requesterId: userId,
        providerId: (await prisma.item.findUnique({ where: { id: itemId } }))!
          .userId,
      },
      include: {
        item: true,
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await prisma.chatMessage.create({
      data: {
        content: message,
        itemRequestId: request.id,
        receiverId: request.providerId,
        senderId: userId,
      },
    });

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

// Get requested items
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.itemRequest.findMany({
      where: {
        requesterId: req.user!.userId,
      },
      include: {
        item: {
          include: {
            images: true,
            user: true,
          },
        },
        provider: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requestedItems = items.map((it) => ({
      ...it,
      item: {
        ...it.item,
        images: it.item.images.map((img) => ({
          ...img,
          imageUrl: `${process.env.SERVER_URL}${img.imageUrl}`,
        })),
      },
    }));

    return res.json(requestedItems);
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req: AuthRequest, res, next) => {
  try {
    const { id, status } = req.body;
    const reqItem = await prisma.itemRequest.findUnique({
      where: {
        id: id,
        providerId: req.user?.userId,
      },
    });

    if (!reqItem) {
      return res.status(404).json({ message: 'No request record found.' });
    }

    const updateItem = await prisma.$transaction(async (tx) => {
      if (status === 'COMPLETED') {
        // Update item quantity
        await tx.item.update({
          where: { id: reqItem.itemId },
          data: { quantity: { decrement: reqItem.quantity } },
        });
      }

      const updateStatus = await tx.itemRequest.update({
        where: { id },
        data: { status },
        include: {
          item: {
            include: {
              images: true,
            },
          },
          provider: true,
        },
      });

      return {
        ...updateStatus,
        item: {
          ...updateStatus.item,
          images: updateStatus.item.images.map((img) => ({
            ...img,
            imageUrl: `${process.env.SERVER_URL}${img.imageUrl}`,
          })),
        },
      };
    });

    return res.json(updateItem);
  } catch (error) {
    next(error);
  }
});

export default router;
