import { query } from '../config/db.js';
import { deleteAttachment } from './storage.service.js';

export const deleteOldMessages = async () => {
  try {
    console.log('Running message cleanup job...');

    // 1. Fetch messages older than 15 days that have an attachment
    const { rows: messagesWithFiles } = await query(
      `SELECT id, attachment_url 
       FROM "messages" 
       WHERE created_at < NOW() - INTERVAL '15 days' 
         AND attachment_url IS NOT NULL`
    );

    // 2. Delete the associated files
    for (const msg of messagesWithFiles) {
      if (msg.attachment_url) {
        await deleteAttachment(msg.attachment_url);
      }
    }

    // 3. Delete the messages from the DB
    const { rowCount } = await query(
      `DELETE FROM "messages" 
       WHERE created_at < NOW() - INTERVAL '15 days'`
    );

    console.log(`Message cleanup complete. Deleted ${rowCount} old messages.`);
  } catch (error) {
    console.error('Failed to run message cleanup job:', error);
  }
};
