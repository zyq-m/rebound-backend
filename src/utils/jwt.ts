import { JwtPayload, sign, verify } from "jsonwebtoken";

const accessKey: string = process.env.ACCESS_SECRET || "secret";
const refreshKey: string = process.env.REFRESH_SECRET || "secret";

const createAccessToken = (payload: JwtPayload) => {
  return sign(payload, accessKey, {
    expiresIn: "30m",
  });
};

const createRefreshToken = (payload: JwtPayload) => {
  return sign(payload, refreshKey, {
    expiresIn: "30d",
  });
};

const verifyAccessToken = async (token: string) => {
  try {
    return verify(token, accessKey);
  } catch (err) {
    return null;
  }
};

const verifyRefreshToken = async (token: string) => {
  try {
    return verify(token, refreshKey);
  } catch (err) {
    return null;
  }
};

export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
