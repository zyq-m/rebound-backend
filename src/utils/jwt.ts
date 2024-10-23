import { JwtPayload, sign, verify } from "jsonwebtoken";

const accessKey: string = process.env.ACCESS_SECRET || "secret";
const refreshKey: string = process.env.REFRESH_SECRET || "secret";

const createAccessToken = (payload: JwtPayload | string) => {
  return sign(payload, accessKey, {
    expiresIn: "2d",
  });
};

const createRefreshToken = (payload: JwtPayload) => {
  return sign(payload, refreshKey, {
    expiresIn: "30d",
  });
};

const verifyAccessToken = async (token: string) => {
  return verify(token, accessKey);
};

const verifyRefreshToken = async (token: string) => {
  return verify(token, refreshKey);
};

export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
