import { RequestHandler } from 'express';
import prisma from '../services/client';

import { check, hash } from '../utils/password';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { JwtPayload } from 'jsonwebtoken';

export type UserPayload = JwtPayload & {
  email?: string | null;
  name?: string | null;
};

const login: RequestHandler = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) return res.status(404).send({ message: 'Email not found' });

    if (!check(password, user?.password))
      return res.status(400).send({ message: 'Incorrect password' });

    const payload = {
      email: user.email,
      name: user.name,
    };

    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    res.status(200).send({ accessToken, refreshToken });
  } catch (error) {
    next();
  }
};

const signUp: RequestHandler = async (req, res, next) => {
  const { email, password, name, phone } = req.body;

  try {
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hash(password),
        name: name,
        phone,
      },
    });

    return res.status(201).send({ email: user.email });
  } catch (error) {
    next(error);
  }
};

const logout: RequestHandler = (req, res) => {
  req.body.user = {};
  res.status(200).send({ message: 'Logged out' });
};

const refresh: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const refreshToken: string | undefined =
    authHeader && authHeader.split(' ')[1];

  if (!refreshToken) {
    return res.status(403).send({ message: 'No credential provided' });
  }

  // Verify refresh token
  try {
    // decode contain information like payload, in token
    const user = await verifyRefreshToken(refreshToken);
    const newAccessToken = createAccessToken(user);

    return res.status(201).send({ accessToken: newAccessToken });
  } catch (error) {
    next();
  }
};

export default { login, signUp, logout, refresh };
