import express from 'express';
import controller from '../controllers/itemController';

const route = express.Router();

route.get('/', controller.getItems);
route.get('/my-item', controller.myItems);
route.get('/my-item/:id', controller.requestedUser);
route.get('/my-request', controller.requestItemList);
route.get('/:id', controller.getItem);

route.post('/', controller.addItem);
route.put('/:id', controller.updateItem);
route.put('/request/:id', controller.recievedItem);
route.post('/:id', controller.requestItem);
route.delete('/:id', controller.deleteItem);

export default route;
