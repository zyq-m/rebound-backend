// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('Error:', error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return res.status(404).json({ error: 'Record not found' });
      case 'P2002':
        const target = (error.meta?.target as string[]) || [];
        return res.status(409).json({
          error: `${target.join(', ')} already exists`,
        });
      case 'P2003':
        return res.status(400).json({ error: 'Foreign key constraint failed' });
      case 'P2014':
        return res.status(400).json({ error: 'Invalid ID provided' });
      default:
        return res.status(400).json({ error: 'Database error occurred' });
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Invalid data provided' });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res
      .status(400)
      .json({ error: 'File too large. Maximum 5MB per image.' });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res
      .status(400)
      .json({ error: 'Too many files. Maximum 5 images allowed.' });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res
      .status(400)
      .json({ error: 'Unexpected field. Use "images" as field name.' });
  }

  // Custom error with status code
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message,
    }),
  });
};
