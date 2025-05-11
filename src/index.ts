import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParse from 'body-parser';

// routes
import authRoutes from './routes/authRoutes';
import itemRoutes from './routes/itemRoutes';
import cartRoutes from './routes/cartRoutes';
import favouriteRoutes from './routes/favouriteRoutes';
import profileRoutes from './routes/profile.routes';
import categoryRoutes from './routes/category.routes';

// middlewares
import authMiddleware from './middlewares/authMiddleware';
import errorHandler from './middlewares/errorHandler';

import multer from 'multer';
import fs from 'node:fs';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import socketHandler from './websocket';

dotenv.config();

const app: Express = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const originConfig = {
  origin: isProduction ? process.env.PROD_ORIGIN?.split(' ') : '*',
};

const FOLDER = path.join(process.env.UPLOAD_FOLDER ?? '/uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(FOLDER)) {
      fs.mkdirSync(FOLDER);
    }
    cb(null, FOLDER);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

app.use(cors(originConfig));
app.use(bodyParse.json());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/api', (req: Request, res: Response) => {
  res.send({ message: 'Rebound' });
});

app.use('/api/images', express.static(FOLDER));
app.use('/api/auth', authRoutes);
app.use(authMiddleware);
app.use('/api/item', itemRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favourite', favouriteRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/category', categoryRoutes);

app.post('/api/upload', upload.array('images', 5), (req, res) => {
  res.status(201).send({ message: 'Uploaded' });
});
app.use(errorHandler);

socketHandler(io);
server.listen(port, () => {
  console.log(`[server]: Server is running at port ${port}`);
});
