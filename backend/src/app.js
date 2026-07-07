import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import router from './routes/index.js';

const app = express();

// Enable if running behind a reverse proxy (e.g., Render, Heroku, Nginx)
app.set('trust proxy', 1);

app.use(cors());
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve local file uploads
app.use('/uploads', express.static('uploads'));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mca-placement-backend',
  });
});

app.use('/api', globalRateLimiter, router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

