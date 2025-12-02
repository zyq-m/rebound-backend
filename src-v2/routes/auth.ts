// src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { CreateUserInput, LoginInput } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Generate tokens function
const generateTokens = (
  userId: string,
  email: string,
  role: string,
  name: string,
) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );

  const refreshToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN },
  );

  return { accessToken, refreshToken };
};

// Store refresh token in database
const storeRefreshToken = async (userId: string, refreshToken: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken },
  });
};

// Verify refresh token
const verifyRefreshToken = async (refreshToken: string) => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
    ) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Register route
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password }: CreateUserInput = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const error = new Error('User already exists') as any;
      error.statusCode = 400;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.email,
      user.role,
      user.name,
    );

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    res.status(201).json({
      message: 'User created successfully',
      user,
      token: { accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
});

// Login route
router.post('/login', async (req, res, next) => {
  try {
    const { email, password }: LoginInput = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error = new Error('Invalid credentials') as any;
      error.statusCode = 400;
      throw error;
    }

    // Check if user is suspended
    if (user.isSuspended) {
      const error = new Error('Account suspended') as any;
      error.statusCode = 403;
      throw error;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error('Invalid credentials') as any;
      error.statusCode = 400;
      throw error;
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.email,
      user.role,
      user.name,
    );

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token: { accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token route
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    console.log('refresh token: ', refreshToken);

    if (!refreshToken) {
      const error = new Error('Refresh token is required') as any;
      error.statusCode = 400;
      throw error;
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(decoded.userId, decoded.email, decoded.role, decoded.name);

    // Store new refresh token
    await storeRefreshToken(decoded.userId, newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    // const authError = new Error('Invalid refresh token') as any;
    // authError.statusCode = 401;
    next(error);
  }
});

// Logout route
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error = new Error('Refresh token is required') as any;
      error.statusCode = 400;
      throw error;
    }

    // Verify token to get user ID
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
    ) as any;

    // Remove refresh token from database
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { refreshToken: null },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Even if token is invalid, we consider logout successful
    res.json({ message: 'Logged out successfully' });
  }
});

// Logout all devices route
router.post('/logout-all', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error = new Error('Refresh token is required') as any;
      error.statusCode = 400;
      throw error;
    }

    // Verify token to get user ID
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
    ) as any;

    // Remove refresh token from database (logging out from all devices)
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { refreshToken: null },
    });

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    const authError = new Error('Invalid token') as any;
    authError.statusCode = 401;
    next(authError);
  }
});

export default router;
