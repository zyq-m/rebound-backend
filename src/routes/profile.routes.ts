import { Router } from "express";
import controller from "../controllers/profile.controller";

const route = Router();

route.get("/", controller.myProfile);
route.put("/edit", controller.editProfile);
route.put("/change-password", controller.changePassword);

export default route;
