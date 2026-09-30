import type { Survey } from './types';

export function isEncryptedResponse(value: unknown, publicKey: Survey['publicKey']): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || !publicKey.n) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.toString('base64') === value && bytes.length === Buffer.from(publicKey.n, 'base64url').length;
}
