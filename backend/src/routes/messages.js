import express from 'express';
import {
  createMessageHandler,
  getMessagesHandler,
  getAllUsersHandler,
  deleteMessageHandler,
} from '../controllers/messages.controller.js';
import { authenticate } from '../middleware/auth.js';

import multer from 'multer';

const router = express.Router();

router.use(authenticate);

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post('/', upload.single('attachment'), createMessageHandler);
router.get('/', getMessagesHandler);
router.get('/users/all', getAllUsersHandler);
router.delete('/:id', deleteMessageHandler);

export default router;
