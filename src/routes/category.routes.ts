import { Router } from 'express';
import controller from '../controllers/itemCategory.controller';

const route = Router();

route.get('/', controller.getCategory);

export default route;
