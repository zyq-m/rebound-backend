import express from 'express';
import controller from '../controllers/favouriteController';

const route = express.Router();

route.get('/', controller.myFavourite);
route.post('/', controller.addToFav);
route.delete('/:id', controller.removeFav);

export default route;
