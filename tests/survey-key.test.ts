import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasSurveyKey } from '../src/lib/crypto-client';

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
