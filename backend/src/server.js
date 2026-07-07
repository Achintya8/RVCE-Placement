import app from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';
import { connectMongo } from './config/mongodb.js';
import { deleteOldMessages } from './services/cleanup.service.js';
import { seedStudentsFromExcel } from './services/seeder.service.js';
import { runMigrations } from './config/migrate.js';

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    
    // Seed student details from Excel on startup
    await seedStudentsFromExcel();
    
    await connectMongo();
    await runMigrations();
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
