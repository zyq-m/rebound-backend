import { RequestHandler } from "express";
import prisma from "../services/client";

import { check, hash } from "../utils/password";
import { createAccessToken, createRefreshToken } from "../utils/jwt";
import { UserRequest } from "../middlewares/authMiddleware";
import { JwtPayload } from "jsonwebtoken";

export interface UserPayload extends JwtPayload {
  email?: string | null;
  name?: string | null;
}

const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) return res.status(404).send({ message: "Email not found" });

  if (!check(password, user?.password))
    return res.status(400).send({ message: "Incorrect password" });

  const payload: UserPayload = {
    email: user?.email,
    name: user?.name,
  };

  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

  res.status(200).send({ accessToken, refreshToken });
};

const signUp: RequestHandler = async (req, res, next) => {
  const { email, password, name, username } = req.body;

  try {
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hash(password),
        name: name,
        username: username,
      },
    });

    return res.status(201).send({ email: user.email });
  } catch (error) {
    next(error);
  }
};

const logout: RequestHandler = (req: UserRequest, res) => {
  req.user = undefined;
  res.status(200).send({ message: "Logged out" });
};

const changePassword: RequestHandler = async (req: UserRequest, res, next) => {
  const { oldPass, newPass, reTypePass } = req.body;
  const email = req.user?.email;

  if (!email) {
    return res.status(404).send({ message: "Email not found" });
  }

  if (newPass !== reTypePass)
    return res
      .status(400)
      .send({ message: "New password not match with retype password" });

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) return res.status(404).send({ message: "Email not found" });

    if (!check(oldPass, user?.password))
      return res.status(400).send({ message: "Incorrect password" });

    await prisma.user.update({
      data: {
        password: hash(newPass),
      },
      where: {
        email,
      },
    });

    return res.status(200).send({ message: "Successfull changed" });
  } catch (error) {
    next(error);
  }
};

export default { login, signUp, logout, changePassword };
