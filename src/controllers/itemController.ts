import { RequestHandler } from "express";
import prisma from "../services/client";

const getItems: RequestHandler = async (req, res) => {
  const items = await prisma.item.findMany({
    // cursor based pagination
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

export { getItems };
