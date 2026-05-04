import { findUsersByNameOrEmail } from '../repositories/messages.repository.js';

/**
 * Extract all @word tokens from a message string.
 * Returns a deduplicated list of raw mention strings (without the @ prefix).
 */
export const parseMentions = (messageText) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(messageText)) !== null) {
    const token = match[1];
    if (!mentions.includes(token)) mentions.push(token);
  }
  return mentions;
};

/**
 * Resolve mention tokens to real user IDs by searching the DB.
 * Takes the first matching user for each token; deduplicates results.
 */
export const getMentionedUserIds = async (mentions) => {
  const userIds = [];
  for (const mention of mentions) {
    const users = await findUsersByNameOrEmail(mention);
    if (users.length > 0) userIds.push(users[0].id);
  }
  return [...new Set(userIds)];
};

/** Validate raw message text before saving. */
export const validateMessageText = (text) => {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Message text is required' };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Message cannot exceed 2000 characters' };
  }
  return { valid: true };
};