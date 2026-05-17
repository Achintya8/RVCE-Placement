import { z } from 'zod';
import {
  createMessageWithMentions,
  getMessages,
  getMessageCount,
  getAllUsers,
  getMessageById,
  deleteMessageById,
} from '../repositories/messages.repository.js';
import {
  parseMentions,
  getMentionedUserIds,
  validateMessageText,
} from '../services/message.service.js';
import { sendToUsers } from '../services/notification.service.js';
import { findUserById } from '../repositories/user.repository.js';
import { deleteAttachment } from '../services/storage.service.js';
import { ApiError } from '../utils/apiError.js';
import { listStudentIds } from '../repositories/user.repository.js';

const messageSchema = z.object({
  messageText: z.string().max(2000).optional(),
  parentId: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
});

// ── POST /api/messages ────────────────────────────────────────────────────────
export const createMessageHandler = async (req, res, next) => {
  try {
    const payload = messageSchema.parse(req.body);
    const text = payload.messageText || '';
    let parentId = null;
    if (payload.parentId && !isNaN(payload.parentId)) {
      parentId = payload.parentId;
    }

    // Allow empty text only if there is an attachment
    if (!text.trim() && !req.file) {
      throw new ApiError(400, 'Message cannot be empty');
    }

    if (text.length > 2000) {
      throw new ApiError(400, 'Message cannot exceed 2000 characters');
    }

    // 1. Resolve @mentions → user IDs
    const mentionTokens  = parseMentions(text);
    const mentionedUserIds = await getMentionedUserIds(mentionTokens);

    // 2. Upload attachment if present
    let attachmentUrl = null;
    let attachmentName = null;
    if (req.file) {
      const { uploadAttachment } = await import('../services/storage.service.js');
      attachmentUrl = await uploadAttachment({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: req.auth.userId,
      });
      attachmentName = req.file.originalname;
    }

    // 3. Persist message + mentions atomically
    const message = await createMessageWithMentions(
      req.auth.userId,
      text,
      mentionedUserIds,
      attachmentUrl,
      attachmentName,
      parentId
    );

    // 3. Fetch sender info for response + notifications
    const sender = await findUserById(req.auth.userId);

    // 4. Build mentionedUsers array for the response
    const mentionedUsers = [];
    for (const uid of mentionedUserIds) {
      const u = await findUserById(uid);
      if (u) mentionedUsers.push({ id: u.id, name: u.name, email: u.collegeEmailId });
    }

    // 5. Push notifications to everyone except the sender
    const allStudentIds = await listStudentIds();
    const senderUserId = Number(req.auth.userId);
    const targetUserIds = allStudentIds.filter((id) => Number(id) !== senderUserId);
    if (targetUserIds.length > 0) {
      await sendToUsers({
        userIds: targetUserIds,
        excludeUserIds: [senderUserId],
        title: sender?.name ? `New message from ${sender.name}` : 'New chat message',
        body: text.substring(0, 100) || 'Sent an attachment',
        data: {
          type: 'chat_message',
          messageId: String(message.id),
          senderId: String(req.auth.userId),
          parentId: parentId ? String(parentId) : undefined,
        },
      });
    }

    // 6. Resolve parent message details if present for response
    let parentMessage = null;
    if (parentId) {
      const pm = await getMessageById(parentId);
      if (pm) {
        const pmu = await findUserById(pm.sender_id);
        parentMessage = {
          id: pm.id,
          senderName: pmu?.name || 'User',
          messageText: pm.message_text,
        };
      }
    }

    res.status(201).json({
      id: message.id,
      sender: {
        id:    sender.id,
        name:  sender.name,
        email: sender.collegeEmailId,
      },
      messageText:    message.message_text,
      attachmentUrl:  message.attachment_url,
      attachmentName: message.attachment_name,
      mentionedUsers,
      createdAt:      message.created_at,
      parentId,
      parentMessage,
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
        attachmentUrl:  msg.attachment_url,
        attachmentName: msg.attachment_name,
        // mentioned_users comes from JSON_AGG — already a parsed JS array
        mentionedUsers: msg.mentioned_users || [],
        createdAt:      msg.created_at,
        parentId:       msg.parentId,
        parentMessage:  msg.parentMessage,
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

// ── DELETE /api/messages/:id ──────────────────────────────────────────────────
export const deleteMessageHandler = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (isNaN(messageId)) {
      throw new ApiError(400, 'Invalid message ID');
    }

    const message = await getMessageById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Check authorization: must be sender or an admin (SPC)
    if (message.sender_id !== req.auth.userId && !req.auth.isSpc) {
      throw new ApiError(403, 'You do not have permission to delete this message');
    }

    // Delete attachment if present
    if (message.attachment_url) {
      await deleteAttachment(message.attachment_url);
    }

    // Delete message
    await deleteMessageById(messageId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
};
