import { RequestHandler } from "express";
import prisma from "../services/client";

const myCart: RequestHandler = async (req, res, next) => {
  const email = req.body.user?.email ?? "";

  try {
    const [cart, count] = await Promise.all([
      prisma.cart.findMany({
        where: {
          email: email,
        },
      }),
      prisma.cart.aggregate({
        where: {
          email: email,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    if (!cart.length)
      return res.status(404).send({ message: "Your cart is empty" });

    return res.status(200).send({ cart: cart, total: count._count.id ?? 0 });
  } catch (error) {
    next(error);
  }
};

const addToCart: RequestHandler = async (req, res, next) => {
  const email = req.body.user?.email ?? "";
  const { itemId, quantity } = req.body;

  try {
    const newCart = await prisma.cart.create({
      data: {
        email: email,
        item_id: +itemId,
        quantity: +quantity,
      },
    });

    return res
      .status(201)
      .send({ cart: newCart, message: "Item added to cart" });
  } catch (error) {
    next(error);
  }
};

const removeItem: RequestHandler = async (req, res, next) => {
  const { id } = req.params;

  try {
    const cart = await prisma.cart.delete({
      where: {
        id: +id,
      },
    });

    return res.status(200).send({ cart: cart, message: "Cart removed" });
  } catch (error) {
    next(error);
  }
};

export default { myCart, addToCart, removeItem };
