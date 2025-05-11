import { RequestHandler } from 'express';
import prisma from '../services/client';
import { check, hash } from '../utils/password';

const myProfile: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body?.user;
    const userProfile = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        avatar: true,
        email: true,
        name: true,
        phone: true,
        timestamp: true,
        username: true,
      },
    });

    if (!userProfile) return res.status(404).send({ message: 'Not found' });

    return res.status(200).send(userProfile);
  } catch (error) {
    next();
  }
};

const editProfile: RequestHandler = async (req, res, next) => {
  try {
    const { name, avatar, email } = req.body;
    const editProfile = await prisma.user.update({
      data: {
        avatar: `images/${avatar}`,
        name,
      },
      where: {
        email,
      },
    });

    if (!editProfile) return res.status(400).send({ message: 'Invalid input' });

    return res.status(200).send({ message: 'Successfully update' });
  } catch (error) {
    next();
  }
};

const changePassword: RequestHandler = async (req, res, next) => {
  const { oldPass, newPass, reTypePass } = req.body;
  const email = req.body.user?.email;

  if (!email) {
    return res.status(404).send({ message: 'Email not found' });
  }

  if (newPass !== reTypePass)
    return res
      .status(400)
      .send({ message: 'New password not match with retype password' });

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) return res.status(404).send({ message: 'Email not found' });

    if (!check(oldPass, user?.password))
      return res.status(400).send({ message: 'Incorrect password' });

    await prisma.user.update({
      data: {
        password: hash(newPass),
      },
      where: {
        email,
      },
    });

    return res.status(200).send({ message: 'Successfull changed' });
  } catch (error) {
    next(error);
  }
};

export default { myProfile, changePassword, editProfile };
