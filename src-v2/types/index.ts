import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface CreateItemInput {
  name: string;
  categoryId: string; // Changed from category to categoryId
  quantity: string;
  condition: string;
  description?: string;
  location: string;
  locationDescription?: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface ItemWithImages {
  id: string;
  name: string;
  quantity: string;
  availability: boolean;
  condition: string;
  description?: string;
  location: string;
  locationDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  categoryId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  category: {
    id: string;
    name: string;
    description?: string;
  };
  images: {
    id: string;
    imageUrl: string;
    createdAt: Date;
  }[];
  likedBy: {
    id: string;
  }[];
  _count?: {
    likedBy: number;
    requests: number;
  };
}

export interface UpdateItemInput extends Partial<CreateItemInput> {
  availability?: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateFoodRequestInput {
  itemId: string;
  message?: string;
}

export interface SendMessageInput {
  receiverId: string;
  content: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SuspendUserInput {
  suspend: boolean;
}

export interface UpdateRequestStatusInput {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
}

export interface Conversation {
  partner: {
    id: string;
    name: string;
    email: string;
  };
  lastMessage: ChatMessage;
  unreadCount: number;
  totalMessages: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
  };
}
