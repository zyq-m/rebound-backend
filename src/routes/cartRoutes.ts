import express from 'express';
import controller from '../controllers/cartController';

const route = express.Router();

route.get('/', controller.myCart);
route.post('/', controller.addToCart);
route.delete('/:id', controller.removeItem);

export default route;
