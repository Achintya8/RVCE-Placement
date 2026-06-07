import { query } from '../src/config/db.js';

async function check() {
  const { rows } = await query('SELECT COUNT(*) as count FROM "notification_subscriptions"');
  console.log('Total subscriptions in DB:', rows[0].count);
  
  const { rows: sample } = await query('SELECT * FROM "notification_subscriptions" LIMIT 2');
  console.log('Sample subscriptions:', sample);
}

check().catch(console.error).finally(() => process.exit(0));
