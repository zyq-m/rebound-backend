import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UserPayload } from "../controllers/authController";

export interface UserRequest extends Request {
  user?: UserPayload;
}

const authMiddleware = (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const accessToken: string | undefined =
    authHeader && authHeader.split(" ")[1];

  if (!accessToken) {
    return res.status(401).send({ message: "No token provided" });
  }

  const decoded = verifyAccessToken(accessToken);

  if (!decoded) {
    return res.status(403).send({ message: "Token expired" });
  }

  req.user = decoded;
  next();
};

export default authMiddleware;
