import { describe, expect, it } from 'vitest';
import { isEncryptedResponse } from '../src/lib/response-validation';

describe('encrypted response validation', () => {
  const publicKey = { n: Buffer.alloc(256, 1).toString('base64url') };

  it('accepts only a canonical ciphertext matching the survey key size', () => {
    expect(isEncryptedResponse(Buffer.alloc(256, 2).toString('base64'), publicKey)).toBe(true);
    expect(isEncryptedResponse(Buffer.alloc(255, 2).toString('base64'), publicKey)).toBe(false);
    expect(isEncryptedResponse('abc', publicKey)).toBe(false);
    expect(isEncryptedResponse('not base64', publicKey)).toBe(false);
  });
});
