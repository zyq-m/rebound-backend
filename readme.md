# Food Sharing Platform - Backend API

A RESTful API for a food sharing platform built with Express.js, TypeScript, MySQL, and Prisma. This platform allows users to share leftover food, request food items, and communicate with each other.

## 🚀 Features

- **User Authentication** - JWT-based authentication system
- **Food Item Management** - Create, read, update food items with multiple images
- **Category Management** - Organized food categorization system
- **Food Requests** - Request available food items from other users
- **Real-time Chat** - Socket.io powered messaging system
- **Admin Dashboard** - User management and platform analytics
- **File Upload** - Multer integration for image uploads
- **Type Safety** - Full TypeScript integration
- **Centralized Error Handling** - Consistent error responses

## 🛠 Tech Stack

- **Backend**: Express.js with TypeScript
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Real-time**: Socket.io
- **CORS**: Enabled for cross-origin requests

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL database
- npm or yarn

## ⚙️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd food-sharing-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/food_sharing_db"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"
   PORT=5000
   NODE_ENV=development
   CLIENT_URL="http://localhost:3000"
   ```

4. **Database Setup**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push schema to database
   npx prisma db push

   # Seed categories (optional)
   npx prisma db seed

   # Open Prisma Studio (optional)
   npx prisma studio
   ```

5. **Create uploads directory**
   ```bash
   mkdir uploads
   ```

## 🚀 Running the Application

**Development mode:**

```bash
npm run dev
```

**Production build:**

```bash
npm run build
npm start
```

The API will be available at `http://localhost:5000`

## 🗄 Database Schema

### Models Overview

- **User** - Platform users with USER/ADMIN roles
- **Category** - Food categories (Ready to eat, Condiment, Drinks, etc.)
- **Item** - Food items linked to categories and users
- **ItemImage** - Multiple images per food item
- **LikedItem** - User-item likes relationship
- **ItemRequest** - Item requests between users
- **ChatMessage** - Real-time chat messages

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

All endpoints (except auth and lookup routes) require JWT token in the header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### Register User

**POST** `/api/auth/register`

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "User created successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "USER"
  },
  "token": "jwt_token"
}
```

### Login

**POST** `/api/auth/login`

**Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register response.

---

## 📋 Lookup Endpoints (Public)

### Get All Categories

**GET** `/api/lookup/categories`

**Response:**

```json
[
  {
    "id": "category_id",
    "name": "Ready to eat",
    "description": "Pre-cooked meals, leftovers, and food items that require no preparation...",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "_count": {
      "items": 15
    }
  }
]
```

### Get Single Category

**GET** `/api/lookup/categories/:id`

---

## 👤 User Endpoints

### Get User Profile

**GET** `/api/users/profile`

**Response:**

```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "USER",
  "isSuspended": false,
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Update Profile

**PUT** `/api/users/profile`

**Body:**

```json
{
  "name": "John Updated",
  "phone": "+0987654321"
}
```

### Change Password

**PUT** `/api/users/change-password`

**Body:**

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

### Get User's Items

**GET** `/api/users/my-items`

**Response:** Array of user's items with images and requests

### Get Liked Items

**GET** `/api/users/liked-items`

### Get Sent Requests

**GET** `/api/users/my-requests`

### Get Received Requests

**GET** `/api/users/received-requests`

---

## 🍕 Item Endpoints

### Get All Available Items

**GET** `/api/items`

**Response:**

```json
[
  {
    "id": "item_id",
    "name": "Fresh Apples",
    "quantity": "2 kg",
    "condition": "Fresh",
    "availability": true,
    "location": "New York",
    "description": "Fresh organic apples",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "category": {
      "id": "category_id",
      "name": "Fruits",
      "description": "Fresh fruits and berries"
    },
    "images": [
      {
        "id": "image_id",
        "imageUrl": "/uploads/item-1234567890.jpg",
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "likedBy": [],
    "_count": {
      "likedBy": 5,
      "requests": 2
    }
  }
]
```

### Create Item (with images)

**POST** `/api/items`

**Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Body (form-data):**

- `name` (string, required): Item name
- `categoryId` (string, required): Category ID from categories list
- `quantity` (string, required): Quantity description
- `condition` (string, required): Item condition
- `location` (string, required): Location
- `description` (string, optional): Description
- `locationDescription` (string, optional): Location details
- `images` (files, optional): Up to 5 images

**Available Categories:**

- Ready to eat
- Condiment
- Drinks
- Can food
- Raw item
- Dry food

### Get Single Item

**GET** `/api/items/:id`

### Update Item

**PUT** `/api/items/:id`

Same as create item, supports updating fields and adding new images.

### Like/Unlike Item

**POST** `/api/items/:id/like`

**Response:**

```json
{
  "message": "Item liked",
  "liked": true
}
```

### Delete Item Image

**DELETE** `/api/items/:itemId/images/:imageId`

---

## 📦 Item Requests Endpoints

### Create Item Request

**POST** `/api/requests`

**Body:**

```json
{
  "itemId": "item_id",
  "message": "I would like to request this item"
}
```

**Response:**

```json
{
  "id": "request_id",
  "status": "PENDING",
  "message": "I would like to request this item",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "item": {
    "id": "item_id",
    "name": "Fresh Apples"
  },
  "requester": {
    "id": "user_id",
    "name": "Requester Name",
    "email": "requester@example.com"
  }
}
```

### Update Request Status

**PUT** `/api/users/requests/:requestId`

**Body:**

```json
{
  "status": "APPROVED" // PENDING, APPROVED, REJECTED, COMPLETED
}
```

---

## 💬 Chat Endpoints

### Get Conversations

**GET** `/api/chat/conversations`

**Response:**

```json
[
  {
    "partner": {
      "id": "user_id",
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "lastMessage": {
      "id": "message_id",
      "content": "Hello!",
      "isRead": false,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "unreadCount": 2,
    "totalMessages": 15
  }
]
```

### Get Messages with User

**GET** `/api/chat/messages/:userId`

**Response:**

```json
{
  "partner": {
    "id": "user_id",
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "messages": [
    {
      "id": "message_id",
      "content": "Hello!",
      "imageUrl": null,
      "isRead": true,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "sender": {
        "id": "sender_id",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### Send Text Message

**POST** `/api/chat/messages`

**Body:**

```json
{
  "receiverId": "user_id",
  "content": "Hello, is this available?"
}
```

### Send Image Message

**POST** `/api/chat/messages/image`

**Headers:**

```
Content-Type: multipart/form-data
```

**Body (form-data):**

- `receiverId` (string, required)
- `image` (file, required): Image file

### Search Users

**GET** `/api/chat/search-users?query=john`

**Response:**

```json
[
  {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }
]
```

---

## ⚡ WebSocket Events (Real-time Chat)

### Connection

```javascript
const socket = io('http://localhost:5000');
```

### Client Events:

- `user_online` - Notify when user comes online
- `join_room` - Join a chat room
- `send_message` - Send a new message

### Server Events:

- `receive_message` - Receive new message
- `user_online` - User came online
- `user_offline` - User went offline
- `message_sent` - Message sent confirmation

---

## 👑 Admin Endpoints

### Get All Users

**GET** `/api/users` (Admin only)

### Suspend/Unsuspend User

**PUT** `/api/users/:userId/suspend` (Admin only)

**Body:**

```json
{
  "suspend": true
}
```

### Create Category

**POST** `/api/lookup/categories` (Admin only)

**Body:**

```json
{
  "name": "New Category",
  "description": "Category description"
}
```

### Update Category

**PUT** `/api/lookup/categories/:id` (Admin only)

### Delete Category

**DELETE** `/api/lookup/categories/:id` (Admin only)

### Get Dashboard Reports

**GET** `/api/users/reports/dashboard` (Admin only)

**Response:**

```json
{
  "overview": {
    "totalUsers": 150,
    "totalItems": 300,
    "totalRequests": 500,
    "activeItems": 120,
    "completedRequests": 250,
    "suspendedUsers": 5
  },
  "recentUsers": [...],
  "popularCategories": [
    {
      "category": "Ready to eat",
      "_count": { "id": 45 }
    }
  ]
}
```

### Delete User

**DELETE** `/api/users/:userId` (Admin only)

---

## 📁 File Upload Specifications

### Item Images

- **Field name**: `images`
- **Max files**: 5
- **Max size**: 5MB per file
- **Allowed types**: JPEG, PNG, GIF, WebP
- **Form data**: `multipart/form-data`

### Chat Images

- **Field name**: `image`
- **Max files**: 1
- **Max size**: 5MB
- **Allowed types**: JPEG, PNG, GIF, WebP
- **Form data**: `multipart/form-data`

---

## 🛡 Error Handling

### Standard Error Response:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (Duplicate)
- `500` - Internal Server Error

### Specific Error Examples:

```json
{
  "error": "Category not found"
}
```

```json
{
  "error": "File too large. Maximum 5MB per image."
}
```

```json
{
  "error": "Too many files. Maximum 5 images allowed."
}
```

---

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed categories data
- `npm run db:studio` - Open Prisma Studio

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Note**: Make sure your MySQL database is running and the connection string in `.env` is correct before starting the application. The categories will be automatically seeded when running `npx prisma db seed`.
