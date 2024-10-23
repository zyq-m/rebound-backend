import express from "express";
import controller from "../controllers/authController";

const route = express.Router();

route.post("/login", controller.login);
route.post("/sign-up", controller.signUp);
route.post("/logout", controller.logout);
route.post("/refresh", controller.refresh);

export default route;
