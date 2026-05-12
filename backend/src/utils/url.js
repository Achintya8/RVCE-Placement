import { env } from '../config/env.js';

/**
 * Replaces localhost URLs with the actual base URL if in production.
 * This fixes legacy database records that have hardcoded localhost links.
 */
export const normalizeUrl = (url) => {
  if (!url || !url.includes('localhost') || !env.baseUrl || env.baseUrl.includes('localhost')) {
    return url;
  }
  
  return url.replace(/https?:\/\/localhost:\d+/, env.baseUrl);
};
