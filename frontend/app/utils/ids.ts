import * as Crypto from 'expo-crypto';

/**
 * A new idempotency key for create requests. Sending the same key again (after a timeout or a
 * retry) makes the server return the original record instead of creating a duplicate.
 */
export function newClientId(): string {
  return Crypto.randomUUID();
}
