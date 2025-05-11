import { Server } from 'socket.io';
import prisma from '../services/client';

const socketHandler = (io: Server) => {
  io.on('connection', (socket) => {
    // console.log('User connected:', socket.id);

    socket.on('registerChatNotification', (email) => {
      socket.join(`notification_${email}`);
      console.log(`${email} join noti`);
    });

    // Join chat room by chatId
    socket.on('joinChat', async (email: string, pEmail: string) => {
      console.log(`${email} join chat`);
      // Find existing chat with both participants
      const existingChat = await prisma.chat.findFirst({
        where: {
          AND: [
            { participants: { some: { email: email } } },
            { participants: { some: { email: pEmail } } },
          ],
        },
        include: { participants: true },
      });

      if (existingChat) {
        // Send chat history to the user
        const messages = await prisma.message.findMany({
          where: {
            chat_id: existingChat.id,
          },
          include: {
            user: {
              select: { name: true, avatar: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        socket.join(`chat_${existingChat.id}`);
        socket.emit('chatHistory', messages);
        return;
      }

      socket.emit('chatHistory', []);
    });

    // Handle sending a new message
    socket.on(
      'sendMessage',
      async (data: {
        chatId?: number;
        senderId: string;
        recipientId: string;
        text: string;
      }) => {
        let { chatId, senderId, text, recipientId } = data;

        if (!chatId) {
          // Find existing chat with both participants
          const existingChat = await prisma.chat.findFirst({
            where: {
              AND: [
                { participants: { some: { email: senderId } } },
                { participants: { some: { email: recipientId } } },
              ],
            },
            include: { participants: true },
          });

          if (existingChat) {
            chatId = existingChat.id;
          } else {
            // Create new chat and connect participants
            const newChat = await prisma.chat.create({
              data: {
                participants: {
                  connect: [{ email: senderId }, { email: recipientId }],
                },
              },
              include: { participants: true },
            });
            chatId = newChat.id;
          }
        }

        // Save message in DB
        const message = await prisma.message.create({
          data: {
            text,
            chat_id: chatId,
            userEmail: senderId,
          },
          include: {
            user: {
              select: { name: true, avatar: true, email: true },
            },
          },
        });

        // Emit the new message to all participants in the chat room
        io.to(`chat_${chatId}`).emit('newMessage', message);
      },
    );

    // notify recipient
    socket.on('getMessages', async (email) => {
      const messages = await prisma.chat.findMany({
        where: {
          participants: {
            some: {
              email: email,
            },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          participants: {
            select: {
              avatar: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const messageList = messages.map((msg) => ({
        ...msg,
        messages: msg.messages[0],
        participants: msg.participants.filter((pt) => pt.email !== email)[0],
      }));

      io.to(`notification_${email}`).emit('onMessages', messageList);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

export default socketHandler;
