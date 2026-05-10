import app from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';
import { connectMongo } from './config/mongodb.js';
import { deleteOldMessages } from './services/cleanup.service.js';

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    await connectMongo();
    app.listen(env.port, () => {
      console.log(`MCA Placement backend listening on port ${env.port}`);
      
      // Start cleanup job: Run once on startup, then every 12 hours
      void deleteOldMessages();
      setInterval(() => {
        void deleteOldMessages();
      }, 12 * 60 * 60 * 1000);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
