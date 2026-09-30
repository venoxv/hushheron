import { describe, expect, it } from 'vitest';
import { isContractAddress, isSurveyId } from '../src/lib/types';

describe('survey identifiers', () => {
  it('accepts the identifiers created by the app', () => {
    expect(isSurveyId(crypto.randomUUID())).toBe(true);
    expect(isContractAddress('a'.repeat(64))).toBe(true);
  });

  it('rejects malformed identifiers before persistence', () => {
    expect(isSurveyId('a'.repeat(36))).toBe(false);
    expect(isContractAddress('a'.repeat(20))).toBe(false);
    expect(isContractAddress('z'.repeat(64))).toBe(false);
  });
});
