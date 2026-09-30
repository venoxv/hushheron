const PRIVATE_RSA_FIELDS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'];

export async function parsePublicEncryptionKey(value: unknown): Promise<JsonWebKey | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.kty !== 'RSA' || input.alg !== 'RSA-OAEP-256' ||
      typeof input.n !== 'string' || input.e !== 'AQAB' ||
      PRIVATE_RSA_FIELDS.some((field) => field in input)) return null;

  // Store only public fields, even if the caller supplied other metadata.
  const publicKey: JsonWebKey = {
    kty: 'RSA', alg: 'RSA-OAEP-256', n: input.n, e: input.e,
    ext: true, key_ops: ['encrypt'],
  };
  try {
    const imported = await crypto.subtle.importKey('jwk', publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    const bits = (imported.algorithm as RsaHashedKeyAlgorithm).modulusLength;
    return bits >= 2048 && bits <= 4096 ? publicKey : null;
  } catch {
    return null;
  }
}
