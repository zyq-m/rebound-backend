import { genSaltSync, hashSync, compareSync } from "bcryptjs";

const salt = genSaltSync(10);

const hash = (password: string) => hashSync(password, salt);

const check = (password: string, hashed: string) =>
  compareSync(password, hashed);

export { hash, check };
