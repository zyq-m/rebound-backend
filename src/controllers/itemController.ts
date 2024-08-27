import { RequestHandler } from "express";
import prisma from "../services/client";
import { UserRequest } from "../middlewares/authMiddleware";

const getItems: RequestHandler = async (req, res) => {
  //TODO: do search query params
  const items = await prisma.item.findMany({
    // TODO: cursor based pagination
    // take: 5,
    // skip: skip,
    // cursor: {
    //     id: itemCursor
    // }

    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },

    orderBy: {
      timestamp: "desc",
    },
  });

  return res.status(200).send(items);
};

const myItems: RequestHandler = async (req: UserRequest, res) => {
  const email = req.user?.email;

  if (!email) return res.status(400).send({ message: "Email not provided" });

  try {
    const items = await prisma.item.findMany({
      where: {
        user: {
          email: email,
        },
      },
    });

    if (!items.length)
      return res.status(404).send({ message: "No items found" });

    return res.status(200).send(items);
  } catch (error) {
    return res.sendStatus(500);
  }
};

const getItem: RequestHandler = async (req, res) => {
  const itemId = req.params?.id;

  if (!itemId) return res.status(400).send({ message: "No id provided" });

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

    if (!item) return res.status(404).send({ message: "Item not found" });

    return res.status(200).send(item);
  } catch (error) {
    return res.sendStatus(500);
  }
};

type ItemRequest = {
  name: string;
  location: string;
  category: string;
  quantity: number;
  description?: string;
  available?: boolean;
  condition?: string;
  expiry?: string | Date;
};

const addItem: RequestHandler = async (req: UserRequest, res) => {
  const { name, category, location, quantity }: ItemRequest = req.body;
  const email = req.user?.email;

  if (!email) return res.status(404).send({ message: "No user found" });

  if (!name || !location || !category || !category || !quantity)
    return res.sendStatus(400);

  try {
    const newItem = prisma.item.create({
      data: {
        name: name,
        location: location,
        category: category,
        quantity: +quantity,
        user: {
          connect: {
            email: email,
          },
        },
      },
    });
    return res.status(201).send(newItem);
  } catch (error) {
    return res.sendStatus(500);
  }
};

const updateItem: RequestHandler = async (req: UserRequest, res) => {
  const {
    name,
    category,
    location,
    quantity,
    description,
    available,
    condition,
    expiry,
  }: ItemRequest = req.body;
  const itemId = req.params?.id;

  if (!itemId) return res.status(404).send({ message: "No id provided" });

  if (!name || !location || !category || !category || !quantity)
    return res.sendStatus(400);

  try {
    const item = prisma.item.update({
      where: {
        id: +itemId,
      },
      data: {
        name: name,
        location: location,
        category: category,
        quantity: +quantity,
        description: description,
        available: available,
        condition: condition,
        expiry: expiry,
      },
    });

    return res.status(200).send(item);
  } catch (error) {
    return res.sendStatus(500);
  }
};

export default { getItems, myItems, getItem, addItem, updateItem };
