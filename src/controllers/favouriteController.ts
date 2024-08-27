import { RequestHandler } from "express";
import prisma from "../services/client";
import { UserRequest } from "../middlewares/authMiddleware";

const myFavourite: RequestHandler = async (req: UserRequest, res) => {
  const email = req.user?.email ?? "";

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
    return res.sendStatus(500);
  }
};

const addToFav: RequestHandler = async (req: UserRequest, res) => {
  const email = req.user?.email ?? "";
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
    return res.sendStatus(500);
  }
};

const removeFav: RequestHandler = async (req: UserRequest, res) => {
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
    return res.sendStatus(500);
  }
};

export default { myFavourite, addToFav, removeFav };
