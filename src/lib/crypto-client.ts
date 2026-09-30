import { hex, randomSecret, unhex } from './types';

export function secretFor(surveyId: string, role: 'creator' | 'participant'): Uint8Array {
  const key = `hushheron:${role}:${surveyId}`;
  let value = localStorage.getItem(key);
  if (!value) {
    value = hex(randomSecret());
    localStorage.setItem(key, value);
  }
  return unhex(value);
}

export async function createSurveyKeys(surveyId: string): Promise<JsonWebKey> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
  const privateKey = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
  localStorage.setItem(`hushheron:decrypt:${surveyId}`, JSON.stringify(privateKey));
  return publicKey;
}

export function hasSurveyKey(surveyId: string): boolean {
  if (typeof window === 'undefined') return false;
  const secret = localStorage.getItem(`hushheron:creator:${surveyId}`);
  const decrypt = localStorage.getItem(`hushheron:decrypt:${surveyId}`);
  if (!secret || !/^[0-9a-f]{64}$/i.test(secret) || !decrypt) return false;
  try {
    const key = JSON.parse(decrypt) as JsonWebKey;
    return key.kty === 'RSA' && key.alg === 'RSA-OAEP-256' &&
      typeof key.n === 'string' && typeof key.e === 'string' && typeof key.d === 'string';
  } catch {
    return false;
  }
}

export function exportSurveyBackup(surveyId: string): string {
  const secret = localStorage.getItem(`hushheron:creator:${surveyId}`);
  const decrypt = localStorage.getItem(`hushheron:decrypt:${surveyId}`);
  if (!secret || !decrypt) throw new Error('This browser does not hold the survey keys');
  return JSON.stringify({ version: 1, surveyId, secret, decrypt: JSON.parse(decrypt) });
}

export function importSurveyBackup(value: string): string {
  const data = JSON.parse(value) as { version?: number; surveyId?: string; secret?: string; decrypt?: JsonWebKey };
  if (data.version !== 1 || !data.surveyId || !data.decrypt || !data.secret || !/^[0-9a-f]{64}$/i.test(data.secret)) {
    throw new Error('Invalid backup');
  }
  localStorage.setItem(`hushheron:creator:${data.surveyId}`, data.secret);
  localStorage.setItem(`hushheron:decrypt:${data.surveyId}`, JSON.stringify(data.decrypt));
  return data.surveyId;
}

const base64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export async function encryptAnswer(publicKey: JsonWebKey, answer: number, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const encoded = new TextEncoder().encode(JSON.stringify({ answer, salt: hex(salt) }));
  return base64(new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded)));
}

export async function decryptAnswer(surveyId: string, ciphertext: string): Promise<{ answer: number; salt: Uint8Array }> {
  const raw = localStorage.getItem(`hushheron:decrypt:${surveyId}`);
  if (!raw) throw new Error('Survey key unavailable in this browser');
  const key = await crypto.subtle.importKey('jwk', JSON.parse(raw) as JsonWebKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  const bytes = fromBase64(ciphertext);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const value = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, copy))) as { answer: number; salt: string };
  if (!Number.isInteger(value.answer) || value.answer < 1 || value.answer > 5) throw new Error('Invalid answer payload');
  return { answer: value.answer, salt: unhex(value.salt) };
}
