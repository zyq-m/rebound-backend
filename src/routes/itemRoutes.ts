import express from "express";
import controller from "../controllers/itemController";

const route = express.Router();

route.get("/", controller.getItems);
route.get("/my-item", controller.myItems);
route.get("/:id", controller.getItem);

route.post("/", controller.addItem);
route.put("/:id", controller.updateItem);

export default route;
