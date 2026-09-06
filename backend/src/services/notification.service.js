import webPush from 'web-push';

import { env } from '../config/env.js';
import {
  deleteNotificationSubscriptionByEndpoint,
  listNotificationSubscriptionsForUsers,
} from '../repositories/notification.repository.js';

const isWebPushConfigured = Boolean(
  env.webPush.publicKey && env.webPush.privateKey && env.webPush.subject,
);

if (isWebPushConfigured) {
  webPush.setVapidDetails(
    env.webPush.subject,
    env.webPush.publicKey,
    env.webPush.privateKey,
  );
}

/**
 * Returns the VAPID public key so client browsers can generate push subscriptions.
 */
export const getPublicVapidKey = () => ({
  configured: isWebPushConfigured,
  publicKey: env.webPush.publicKey,
});

/**
 * Dispatches Web Push Notifications to targeted users:
 * 1. Filters out duplicate user IDs and any explicitly excluded users (e.g. the sender).
 * 2. Fetches stored endpoint subscriptions from PostgreSQL (`notification_subscriptions`).
 * 3. Serializes the notification payload (title, body, metadata like type and deep-link IDs).
 * 4. Sends push packets concurrently using `Promise.allSettled`.
 * 5. Automatic Dead-Endpoint Cleanup: Catches HTTP 404 (Not Found) or 410 (Gone) from FCM/Mozilla
 *    and deletes dead subscriptions from PostgreSQL to keep the table clean.
 */
export const sendToUsers = async ({
  userIds,
  title,
  body,
  data = {},
  excludeUserIds = [],
}) => {
  const excludedUserIds = new Set(excludeUserIds.map(Number).filter(Boolean));
  const uniqueUserIds = [
    ...new Set(userIds.map(Number).filter(Boolean)),
  ].filter((userId) => !excludedUserIds.has(userId));

  if (!isWebPushConfigured) {
    return {
      configured: false,
      requested: uniqueUserIds.length,
      sent: 0,
      failed: 0,
    };
  }

  const subscriptions = await listNotificationSubscriptionsForUsers(uniqueUserIds);
  const payload = JSON.stringify({
    notification: {
      title,
      body,
      data: Object.entries(data).reduce((accumulator, [key, value]) => {
        accumulator[key] = value == null ? '' : String(value);
        return accumulator;
      }, {}),
    },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async ({ endpoint, subscription }) => {
      try {
        await webPush.sendNotification(subscription, payload);
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await deleteNotificationSubscriptionByEndpoint(endpoint);
        }
        throw error;
      }
    }),
  );

  const sent = results.filter((result) => result.status === 'fulfilled').length;
  const failed = results.length - sent;

  if (failed > 0 || subscriptions.length === 0) {
    console.warn('Web Push notification delivery summary', {
      requestedUsers: uniqueUserIds.length,
      subscriptions: subscriptions.length,
      sent,
      failed,
    });
  }

  return {
    configured: true,
    requested: uniqueUserIds.length,
    subscriptions: subscriptions.length,
    sent,
    failed,
  };
};
