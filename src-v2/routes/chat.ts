// src/routes/chat.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { upload } from '../middleware/upload';

const router = express.Router();
const prisma = new PrismaClient();

// Get all conversations for current user
router.get('/conversations', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;

    // Get the latest message for each conversation with item request context
    const latestMessages = await prisma.chatMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      distinct: ['itemRequestId'], // Get one message per conversation
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        receiver: {
          select: { id: true, name: true, email: true },
        },
        itemRequest: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                images: {
                  select: { imageUrl: true },
                  take: 1, // Just get first image for thumbnail
                },
              },
            },
            requester: {
              select: { id: true, name: true, email: true },
            },
            provider: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get unread counts for each conversation
    const unreadCounts = await prisma.chatMessage.groupBy({
      by: ['itemRequestId'],
      where: {
        receiverId: userId,
        isRead: false,
      },
      _count: {
        _all: true,
      },
    });

    // Get total message counts for each conversation
    const messageCounts = await prisma.chatMessage.groupBy({
      by: ['itemRequestId'],
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      _count: {
        _all: true,
      },
    });

    // Create a map for quick lookup
    const unreadMap = new Map(
      unreadCounts.map((uc) => [uc.itemRequestId, uc._count._all]),
    );
    const messageCountMap = new Map(
      messageCounts.map((mc) => [mc.itemRequestId, mc._count._all]),
    );

    // Format the response
    const formattedConversations = latestMessages.map((message) => {
      const itemRequest = message.itemRequest;
      const isRequester = itemRequest.requesterId === userId;
      const partner = isRequester
        ? itemRequest.provider
        : itemRequest.requester;

      return {
        id: itemRequest.id, // Use itemRequest id as conversation id
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
        },
        item: {
          id: itemRequest.item.id,
          name: itemRequest.item.name,
          image: itemRequest.item.images[0]?.imageUrl || null,
        },
        request: {
          id: itemRequest.id,
          status: itemRequest.status,
          quantity: itemRequest.quantity,
          initialMessage: itemRequest.message,
        },
        lastMessage: {
          id: message.id,
          content: message.content,
          sender: {
            id: message.sender.id,
            name: message.sender.name,
          },
          isFromCurrentUser: message.senderId === userId,
          isRead: message.isRead,
          createdAt: message.createdAt,
        },
        unreadCount: unreadMap.get(itemRequest.id) || 0,
        totalMessages: messageCountMap.get(itemRequest.id) || 0,
        updatedAt: message.createdAt, // Last activity time
      };
    });

    // Sort by last message time (already sorted by query, but ensure)
    formattedConversations.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    res.json(formattedConversations);
  } catch (error) {
    next(error);
  }
});

// Get messages with a specific user
router.get('/messages/:requestId', async (req: AuthRequest, res, next) => {
  try {
    const currentUserId = req.user!.userId;
    const reqId = req.params.requestId;

    const messages = await prisma.itemRequest.findUnique({
      where: {
        id: reqId,
        OR: [
          {
            requesterId: currentUserId,
          },
          {
            providerId: currentUserId,
          },
        ],
      },
      include: {
        chats: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        provider: {
          select: { id: true, name: true, imageUrl: true },
        },
        requester: {
          select: { id: true, name: true, imageUrl: true },
        },
        item: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!messages) {
      return res.status(404).json({ message: 'No chat found' });
    }

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        senderId: messages.providerId,
        receiverId: currentUserId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// Send text message
router.post('/messages', async (req: AuthRequest, res, next) => {
  try {
    const { receiverId, content, itemRequestId } = req.body;
    const senderId = req.user!.userId;

    if (!content || !receiverId) {
      return res
        .status(400)
        .json({ error: 'Content and receiver ID are required' });
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, isSuspended: true },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    if (receiver.isSuspended) {
      return res
        .status(400)
        .json({ error: 'Cannot send message to suspended user' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        content,
        senderId,
        receiverId,
        itemRequestId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        receiver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// Send image message
router.post(
  '/messages/image',
  upload.single('image'),
  async (req: AuthRequest, res, next) => {
    try {
      const { receiverId, itemRequestId } = req.body;
      const senderId = req.user!.userId;

      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      if (!receiverId) {
        return res.status(400).json({ error: 'Receiver ID is required' });
      }

      // Verify receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, isSuspended: true },
      });

      if (!receiver) {
        return res.status(404).json({ error: 'Receiver not found' });
      }

      if (receiver.isSuspended) {
        return res
          .status(400)
          .json({ error: 'Cannot send message to suspended user' });
      }

      const message = await prisma.chatMessage.create({
        data: {
          content: '📷 Image',
          imageUrl: `/uploads/${req.file.filename}`,
          itemRequestId,
          senderId,
          receiverId,
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
          receiver: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  },
);

// Mark messages as read
router.put('/messages/read', async (req: AuthRequest, res, next) => {
  try {
    const { senderId } = req.body;
    const receiverId = req.user!.userId;

    await prisma.chatMessage.updateMany({
      where: {
        senderId,
        receiverId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
});

// Get unread messages count
router.get('/messages/unread/count', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;

    const unreadCount = await prisma.chatMessage.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

// Search users for chatting
router.get('/search-users', async (req: AuthRequest, res, next) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [{ name: { contains: query } }, { email: { contains: query } }],
          },
          { id: { not: req.user!.userId } }, // Exclude current user
          { isSuspended: false }, // Exclude suspended users
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      take: 10,
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Delete a message
router.delete('/messages/:messageId', async (req: AuthRequest, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.userId;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only allow sender to delete their own messages
    if (message.senderId !== userId) {
      return res
        .status(403)
        .json({ error: 'Cannot delete other users messages' });
    }

    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
