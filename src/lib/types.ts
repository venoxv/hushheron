export type Survey = {
  id: string;
  title: string;
  question: string;
  description: string;
  contractAddress: string;
  publicKey: JsonWebKey;
  createdAt: string;
};

export type EligibilityRequest = { commitment: string };
export type EncryptedResponse = { commitment: string; ciphertext: string };

export const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const unhex = (value: string): Uint8Array => {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error('Expected a 32-byte hex value');
  return Uint8Array.from(value.match(/../g)!, (byte) => Number.parseInt(byte, 16));
};

export const randomSecret = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

export const isCommitment = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);

export const shortAddress = (value: string): string =>
  value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value;
