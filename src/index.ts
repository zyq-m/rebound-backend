import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

// routes
import authRoutes from "./routes/authRoutes";
import itemRoutes from "./routes/itemRoutes";
import cartRoutes from "./routes/cartRoutes";
import favouriteRoutes from "./routes/favouriteRoutes";

// middlewares
import authMiddleware from "./middlewares/authMiddleware";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Rebound" });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at port ${port}`);
});

app.use("/auth", authRoutes);
app.use(authMiddleware);
app.use("/item", itemRoutes);
app.use("/cart", cartRoutes);
app.use("/favourite", favouriteRoutes);
