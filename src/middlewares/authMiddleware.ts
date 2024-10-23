import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"];
    const accessToken: string | undefined =
      authHeader && authHeader.split(" ")[1];

    if (!accessToken) {
      return res.status(401).send({ message: "No token provided" });
    }
    const decoded = await verifyAccessToken(accessToken);
    req.body.user = decoded;

    if (!req.body?.user?.email)
      return res.status(404).send({ message: "No email found" });

    next();
  } catch (error) {
    return res.status(403).send({ message: "Token expired" });
  }
};

export default authMiddleware;
