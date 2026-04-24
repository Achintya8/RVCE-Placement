import { Router } from 'express';

import { saveApplication } from '../controllers/applications.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.put('/company/:companyId', saveApplication);

export default router;

