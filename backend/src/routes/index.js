import { Router } from 'express';

import applicationsRoutes from './applications.routes.js';
import authRoutes from './auth.routes.js';
import companiesRoutes from './companies.routes.js';
import formsRoutes from './forms.routes.js';
import questionsRoutes from './questions.routes.js';
import responsesRoutes from './responses.routes.js';
import messagesRoutes from './messages.js';
import usersRoutes from './users.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/companies', companiesRoutes);
router.use('/applications', applicationsRoutes);
router.use('/forms', formsRoutes);
router.use('/questions', questionsRoutes);
router.use('/responses', responsesRoutes);
router.use('/messages', messagesRoutes);

export default router;
