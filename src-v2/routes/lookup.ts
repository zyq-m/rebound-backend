// src/routes/lookup.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories (public endpoint)
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Get single category
router.get('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    if (!category) {
      const error = new Error('Category not found') as any;
      error.statusCode = 404;
      throw error;
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Create category (Admin only)
router.post(
  '/categories',
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        const error = new Error('Category name is required') as any;
        error.statusCode = 400;
        throw error;
      }

      const category = await prisma.category.create({
        data: {
          name,
          description,
        },
      });

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  },
);

// Update category (Admin only)
router.put(
  '/categories/:id',
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const category = await prisma.category.update({
        where: { id },
        data: {
          name,
          description,
        },
      });

      res.json(category);
    } catch (error) {
      next(error);
    }
  },
);

// Delete category (Admin only)
router.delete(
  '/categories/:id',
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;

      // Check if category has items
      const categoryWithItems = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      });

      if (!categoryWithItems) {
        const error = new Error('Category not found') as any;
        error.statusCode = 404;
        throw error;
      }

      if (categoryWithItems._count.items > 0) {
        const error = new Error(
          'Cannot delete category with existing items',
        ) as any;
        error.statusCode = 400;
        throw error;
      }

      await prisma.category.delete({
        where: { id },
      });

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
);

// Get expiry
router.get('/expiries', (req, res) => {
  res.json([
    { id: 1, label: 'A day', value: 'a-day' },
    { id: 2, label: '3 days', value: '3-day' },
    { id: 3, label: '5 days', value: '5-day' },
    { id: 4, label: 'A week', value: 'a-week' },
  ]);
});

router.get('/conditions', async (req, res) => {
  const conditions = await prisma.condition.findMany();

  return res.json(conditions);
});

export default router;
