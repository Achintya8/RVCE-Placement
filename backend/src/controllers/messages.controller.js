import { z } from 'zod';
import {
  createMessageWithMentions,
  getMessages,
  getMessageCount,
  getAllUsers,
} from '../repositories/messages.repository.js';
import {
  parseMentions,
  getMentionedUserIds,
  validateMessageText,
} from '../services/message.service.js';
import { sendToUsers } from '../services/notification.service.js';
import { findUserById } from '../repositories/user.repository.js';
import { ApiError } from '../utils/apiError.js';

const messageSchema = z.object({
  messageText: z.string().min(1).max(2000),
});

// ── POST /api/messages ────────────────────────────────────────────────────────
export const createMessageHandler = async (req, res, next) => {
  try {
    const payload = messageSchema.parse(req.body);

    const validation = validateMessageText(payload.messageText);
    if (!validation.valid) throw new ApiError(400, validation.error);

    // 1. Resolve @mentions → user IDs
    const mentionTokens  = parseMentions(payload.messageText);
    const mentionedUserIds = await getMentionedUserIds(mentionTokens);

    // 2. Persist message + mentions atomically
    const message = await createMessageWithMentions(
      req.auth.userId,
      payload.messageText,
      mentionedUserIds,
    );

    // 3. Fetch sender info for response + notifications
    const sender = await findUserById(req.auth.userId);

    // 4. Build mentionedUsers array for the response
    const mentionedUsers = [];
    for (const uid of mentionedUserIds) {
      const u = await findUserById(uid);
      if (u) mentionedUsers.push({ id: u.id, name: u.name, email: u.collegeEmailId });
    }

    // 5. Push FCM notifications to mentioned users
    if (mentionedUserIds.length > 0) {
      await sendToUsers({
        userIds: mentionedUserIds,
        title: `${sender.name} mentioned you`,
        body: payload.messageText.substring(0, 100),
        data: {
          type:      'message_mention',
          messageId: String(message.id),
          senderId:  String(req.auth.userId),
        },
      });
    }

    res.status(201).json({
      id: message.id,
      sender: {
        id:    sender.id,
        name:  sender.name,
        email: sender.collegeEmailId,
      },
      messageText:    message.message_text,
      mentionedUsers,
      createdAt:      message.created_at,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/messages ─────────────────────────────────────────────────────────
export const getMessagesHandler = async (req, res, next) => {
  try {
    const limit  = Math.min(Number(req.query.limit)  || 50, 100);
    const offset = Number(req.query.offset) || 0;

    const [messages, total] = await Promise.all([
      getMessages(limit, offset),
      getMessageCount(),
    ]);

    res.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        sender: {
          id:    msg.sender_id,
          name:  msg.sender_name,
          email: msg.sender_email,
        },
        messageText:    msg.message_text,
        // mentioned_users comes from JSON_AGG — already a parsed JS array
        mentionedUsers: msg.mentioned_users || [],
        createdAt:      msg.created_at,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/messages/users/all ───────────────────────────────────────────────
export const getAllUsersHandler = async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
};