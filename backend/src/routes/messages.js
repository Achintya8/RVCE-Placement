import express from 'express';
import {
  createMessageHandler,
  getMessagesHandler,
  getAllUsersHandler,
} from '../controllers/messages.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createMessageHandler);
router.get('/', getMessagesHandler);
router.get('/users/all', getAllUsersHandler);

export default router;
