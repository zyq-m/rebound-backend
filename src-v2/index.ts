// src/server.ts
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import itemRoutes from './routes/items';
import requestRoutes from './routes/requests';
import chatRoutes from './routes/chat';
import lookupRoutes from './routes/lookup';

import { authenticateToken } from './middleware/auth';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/items', authenticateToken, itemRoutes);
app.use('/api/requests', authenticateToken, requestRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/lookup', authenticateToken, lookupRoutes);

app.use(errorHandler);

// Socket.io for real-time chat
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_online', (userId: string) => {
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit('user_online', userId);
  });

  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
  });

  socket.on(
    'send_message',
    async (data: {
      content: string;
      senderId: string;
      receiverId: string;
      itemRequestId: string;
    }) => {
      try {
        const message = await prisma.chatMessage.create({
          data: {
            itemRequestId: data.itemRequestId,
            content: data.content,
            receiverId: data.receiverId,
            senderId: data.senderId,
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

        // Send to receiver
        io.to(data.itemRequestId).emit('receive_message', message);

        // Send back to sender for confirmation
        socket.emit('message_sent', message);
      } catch (error) {
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    },
  );

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user_offline', userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
