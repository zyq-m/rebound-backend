import { RequestHandler } from 'express';
import prisma from '../services/client';

const getCategory: RequestHandler = async (req, res, next) => {
  try {
    const category = await prisma.itemCategory.findMany();

    res.status(200).send(category);
  } catch (error) {
    next(error);
  }
};

export default { getCategory };
