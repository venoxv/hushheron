import { beforeAll, describe, expect, it } from 'vitest';
import { parsePublicEncryptionKey } from '../src/lib/public-key';

let publicKey: JsonWebKey;
let privateKey: JsonWebKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
  publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
  privateKey = await crypto.subtle.exportKey('jwk', pair.privateKey);
});

describe('survey public key validation', () => {
  it('accepts a usable encryption key and removes extra fields', async () => {
    const parsed = await parsePublicEncryptionKey({ ...publicKey, note: 'not public metadata' });
    expect(parsed).toMatchObject({ kty: 'RSA', alg: 'RSA-OAEP-256', n: publicKey.n, e: publicKey.e });
    expect(parsed).not.toHaveProperty('note');
  });

  it('refuses a private key or malformed modulus', async () => {
    expect(await parsePublicEncryptionKey(privateKey)).toBeNull();
    expect(await parsePublicEncryptionKey({ ...publicKey, n: 'invalid' })).toBeNull();
  });
});
