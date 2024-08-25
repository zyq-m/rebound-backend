import express from "express";
import controller from "../controllers/authController";

const route = express.Router();

route.post("/login", controller.login);
route.post("/sign-up", controller.signUp);
route.post("/logout", controller.logout);

export default route;
