import { RequestHandler } from "express";
import prisma from "../services/client";

const myFavourite: RequestHandler = async (req, res, next) => {
  const email = req.body.user?.email ?? "";

  try {
    const [favourite, count] = await Promise.all([
      prisma.favourite.findMany({
        where: {
          email: email,
        },
      }),
      prisma.favourite.aggregate({
        where: {
          email: email,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    if (!favourite.length)
      return res.status(404).send({ message: "Your favourite item is empty" });

    return res
      .status(200)
      .send({ favourite: favourite, total: count._count.id ?? 0 });
  } catch (error) {
    next(error);
  }
};

const addToFav: RequestHandler = async (req, res, next) => {
  const email = req.body.user?.email ?? "";
  const { itemId } = req.body;

  try {
    const newFav = await prisma.favourite.create({
      data: {
        email: email,
        item_id: +itemId,
      },
    });

    return res
      .status(201)
      .send({ favourite: newFav, message: "Item added to favourite" });
  } catch (error) {
    next(error);
  }
};

const removeFav: RequestHandler = async (req, res, next) => {
  const { id } = req.params;

  try {
    const favourite = await prisma.favourite.delete({
      where: {
        id: +id,
      },
    });

    return res
      .status(200)
      .send({ favourite: favourite, message: "Favourite removed" });
  } catch (error) {
    next(error);
  }
};

export default { myFavourite, addToFav, removeFav };
