import { RequestHandler } from "express";
import prisma from "../services/client";

const getItems: RequestHandler = async (req, res, next) => {
  const { name } = req.params;
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
          avatar: true,
        },
      },
    },

    where: {
      name: {
        contains: name,
      },
      available: true,
    },

    orderBy: {
      timestamp: "desc",
    },
  });

  if (!items.length)
    return res.status(404).send({ message: "Not found items" });

  return res.status(200).send(items);
};

const myItems: RequestHandler = async (req, res, next) => {
  const email = req.body.user?.email;

  if (!email) return res.status(400).send({ message: "Email not provided" });

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
      return res.status(404).send({ message: "No items found" });

    return res.status(200).send(items);
  } catch (error) {
    next(error);
  }
};

const getItem: RequestHandler = async (req, res, next) => {
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
    next(error);
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
  expiry: string | Date;
  images: [{ name: string }];
};

const addItem: RequestHandler = async (req, res, next) => {
  const {
    name,
    category,
    location,
    quantity,
    expiry,
    condition,
    description,
    images,
  }: ItemRequest = req.body;
  const email = req.body.user?.email;

  if (!email) return res.status(404).send({ message: "No user found" });

  if (!name || !location || !category || !category || !quantity)
    return res.sendStatus(400);

  try {
    const newItem = await prisma.item.create({
      data: {
        name: name,
        location: location,
        category: category,
        quantity: +quantity,
        expiry: expiry,
        condition: condition,
        description: description,
        images: images.map((img) => ({
          uri: `${process.env.URL_NAME}/images/${img.name}`,
        })),
        user: {
          connect: {
            email: email,
          },
        },
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
    console.log(req.params);
    console.log(req.body);

    const item = await prisma.item.findUnique({
      where: { id: +itemId, available: true },
    });

    if (!item) return res.status(404).send({ message: "Item not found" });

    const temp = item.quantity - quantity;
    const [updateItem, saveHistory] = await Promise.all([
      prisma.item.update({
        data: {
          quantity: temp,
          available: temp == 0 ? false : true,
        },
        where: {
          id: item.id,
        },
      }),
      prisma.requestHistory.create({
        data: {
          quantity,
          email,
          item_id: item.id,
        },
      }),
    ]);

    return res
      .status(200)
      .send({ message: "Item requested", item: updateItem });
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
        completed: "asc",
      },
      include: {
        item: true,
      },
    });

    if (!item.length)
      return res.status(404).send({ message: "No request lists" });

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

    return res.status(200).send({ message: "Successfull recieved" });
  } catch (error) {
    next();
  }
};

export default {
  getItems,
  myItems,
  getItem,
  addItem,
  updateItem,
  requestItem,
  requestItemList,
  recievedItem,
};
