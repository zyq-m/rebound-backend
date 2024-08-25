import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

// routes
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send({ test: "Express" });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at port ${port}`);
});

app.use("/auth", authRoutes);
// app.use("/item");
// app.use("/cart");
// app.use("/favourite");
