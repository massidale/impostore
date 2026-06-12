import { Platform } from 'react-native';

/** Production hosting URL — fallback for native builds, where there is no window. */
const PROD_WEB_URL = 'https://gameshub-6b1ce.web.app';

/**
 * Base URL guests should use to join a room (QR code / share link).
 *
 * On web it follows the origin the host is actually running on, so links
 * generated from localhost, a staging preview channel or production all
 * point back to the same environment instead of always to production.
 */
export function getWebBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return PROD_WEB_URL;
}
