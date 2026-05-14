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

export const getPublicVapidKey = () => ({
  configured: isWebPushConfigured,
  publicKey: env.webPush.publicKey,
});

export const sendToUsers = async ({ userIds, title, body, data = {} }) => {
  const uniqueUserIds = [...new Set(userIds.map(Number).filter(Boolean))];

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
