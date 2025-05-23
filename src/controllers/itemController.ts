import { RequestHandler } from 'express';
import prisma from '../services/client';
import Item from '../models/Item';

const itemModel = new Item();

const getItems: RequestHandler = async (req, res, next) => {
  const { name, categoryId, take } = req.query as {
    name: string;
    categoryId: string;
    take: string;
  };

  const email = req.body.user?.email;
  const items = await itemModel.filterItem({
    name,
    categoryId: +categoryId,
    email,
    take: take ? +take : undefined,
  });

  if (!items.length)
    return res.status(404).send({ message: 'Not found items' });

  return res.status(200).send(items);
};

const myItems: RequestHandler = async (req, res, next) => {
  const email = req.body.user?.email;

  if (!email) return res.status(400).send({ message: 'Email not provided' });

  try {
    const items = await prisma.item.findMany({
      where: {
        user: {
          email: email,
        },
      },

      include: {
        user: {
          select: {
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!items.length)
      return res.status(404).send({ message: 'No items found' });

    return res.status(200).send(items);
  } catch (error) {
    next(error);
  }
};

const getItem: RequestHandler = async (req, res, next) => {
  const itemId = req.params?.id;

  if (!itemId) return res.status(400).send({ message: 'No id provided' });

  try {
    const item = await prisma.item.findUnique({
      where: {
        id: +itemId,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!item) return res.status(404).send({ message: 'Item not found' });

    return res.status(200).send(item);
  } catch (error) {
    next(error);
  }
};

type ItemRequest = {
  name: string;
  location: string;
  categoryId: number;
  quantity: number;
  description?: string;
  available?: boolean;
  condition?: string;
  expiry: string | Date;
  images: [{ name: string }];
};

const addItem: RequestHandler = async (req, res, next) => {
  const {
    name,
    categoryId,
    location,
    quantity,
    expiry,
    condition,
    description,
    images,
  }: ItemRequest = req.body;
  const email = req.body.user?.email;

  if (!email) return res.status(404).send({ message: 'No user found' });

  if (!name || !location || !categoryId || !categoryId || !quantity)
    return res.sendStatus(400);

  try {
    const newItem = await prisma.item.create({
      data: {
        name: name,
        location: location,
        category_id: +categoryId,
        quantity: +quantity,
        expiry: expiry,
        condition: condition,
        description: description,
        images: images.map((img) => ({
          uri: `images/${img.name}`,
        })),
        email: email,
      },
    });

    return res.status(201).send(newItem);
  } catch (error) {
    next(error);
  }
};

const updateItem: RequestHandler = async (req, res, next) => {
  const {
    name,
    categoryId,
    location,
    quantity,
    description,
    available,
    condition,
    expiry,
  }: ItemRequest = req.body;
  const itemId = req.params?.id;

  if (!itemId) return res.status(404).send({ message: 'No id provided' });

  if (!name || !location || !categoryId || !categoryId || !quantity)
    return res.sendStatus(400);

  try {
    const item = prisma.item.update({
      where: {
        id: +itemId,
      },
      data: {
        name: name,
        location: location,
        category_id: categoryId,
        quantity: +quantity,
        description: description,
        available: available,
        condition: condition,
        expiry: expiry,
      },
    });

    return res.status(200).send(item);
  } catch (error) {
    next(error);
  }
};

type ItemRequested = {
  quantity: number;
  user: {
    email: string;
  };
};

const requestItem: RequestHandler = async (req, res, next) => {
  try {
    const {
      quantity,
      user: { email },
    }: ItemRequested = req.body;
    const itemId = req.params?.id;

    const item = await prisma.item.findUnique({
      where: { id: +itemId, available: true },
    });

    if (!item) return res.status(404).send({ message: 'Item not found' });

    const saveHistory = await prisma.requestHistory.create({
      data: {
        quantity,
        email,
        item_id: item.id,
      },
    });

    return res
      .status(200)
      .send({ message: 'Item requested', item: saveHistory });
  } catch (error) {
    next();
  }
};

const requestItemList: RequestHandler = async (req, res, next) => {
  try {
    const email = req.body.user.email;
    const item = await prisma.requestHistory.findMany({
      where: {
        email: email,
      },
      orderBy: {
        completed: 'asc',
      },
      include: {
        item: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!item.length)
      return res.status(404).send({ message: 'No request lists' });

    return res.status(200).send(item);
  } catch (error) {
    next();
  }
};

const recievedItem: RequestHandler = async (req, res, next) => {
  try {
    const requestId = req.params?.id;
    const reqItem = await prisma.requestHistory.update({
      data: {
        completed: true,
      },
      where: {
        id: +requestId,
      },
    });

    if (reqItem) {
      await prisma.item.update({
        data: {
          quantity: {
            decrement: 1,
          },
        },
        where: {
          id: reqItem.item_id,
        },
      });
    }

    return res.status(200).send({ message: 'Successfull recieved' });
  } catch (error) {
    next();
  }
};

const requestedUser: RequestHandler = async (req, res, next) => {
  const itemId = req.params?.id;

  if (!itemId) return res.status(400).send({ message: 'No id provided' });

  try {
    const item = await prisma.item.findUnique({
      where: {
        id: +itemId,
      },
      include: {
        requested_user: {
          include: {
            user: {
              select: {
                avatar: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!item) return res.status(404).send({ message: 'Item not found' });

    return res.status(200).send(item);
  } catch (error) {
    next(error);
  }
};

const deleteItem: RequestHandler = async (req, res, next) => {
  let itemId: string | number = req.params?.id;
  itemId = +itemId;

  try {
    // Delete related records first to maintain referential integrity
    await prisma.$transaction([
      prisma.cart.deleteMany({ where: { item_id: itemId } }),
      prisma.favourite.deleteMany({ where: { item_id: itemId } }),
      prisma.requestHistory.deleteMany({ where: { item_id: itemId } }),
    ]);

    // Now delete the item
    const deletedItem = await prisma.item.delete({
      where: { id: itemId },
    });

    return res
      .status(200)
      .send({ message: 'Item successfully deleted', item: deletedItem });
  } catch (error) {
    console.error('Error deleting item:', error);
    next(error);
  }
};

export default {
  requestedUser,
  getItems,
  myItems,
  getItem,
  addItem,
  updateItem,
  requestItem,
  requestItemList,
  recievedItem,
  deleteItem,
};
