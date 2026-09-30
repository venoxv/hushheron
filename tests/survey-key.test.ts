import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasSurveyKey, importSurveyBackup } from '../src/lib/crypto-client';

afterEach(() => vi.unstubAllGlobals());

describe('creator key availability', () => {
  it('requires both the creator secret and a usable private key shape', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null });
    const id = 'survey';
    values.set(`hushheron:decrypt:${id}`, JSON.stringify({ kty: 'RSA', alg: 'RSA-OAEP-256', n: 'n', e: 'AQAB', d: 'd' }));
    expect(hasSurveyKey(id)).toBe(false);
    values.set(`hushheron:creator:${id}`, 'a'.repeat(64));
    expect(hasSurveyKey(id)).toBe(true);
    values.set(`hushheron:decrypt:${id}`, '{');
    expect(hasSurveyKey(id)).toBe(false);
  });
});

describe('creator backup import', () => {
  it('rejects invalid keys and will not overwrite an existing survey secret', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const surveyId = crypto.randomUUID();
    const pair = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true, ['encrypt', 'decrypt'],
    );
    const backup = { version: 1, surveyId, secret: 'a'.repeat(64), decrypt: await crypto.subtle.exportKey('jwk', pair.privateKey) };
    await expect(importSurveyBackup(JSON.stringify({ ...backup, decrypt: { kty: 'RSA' } }))).rejects.toThrow('Invalid backup decryption key');
    expect(values.size).toBe(0);
    expect(await importSurveyBackup(JSON.stringify(backup))).toBe(surveyId);
    await expect(importSurveyBackup(JSON.stringify({ ...backup, secret: 'b'.repeat(64) }))).rejects.toThrow('already holds different keys');
    expect(values.get(`hushheron:creator:${surveyId}`)).toBe(backup.secret);
  });
});
