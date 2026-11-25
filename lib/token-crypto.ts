import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function encryptionKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 random bytes, base64-encoded (openssl rand -base64 32)");
  }
  return key;
}

/**
 * AES-256-GCM encrypts a secret for storage. Output is `enc:v1:<iv>.<tag>.<ciphertext>` (base64url).
 * If TOKEN_ENCRYPTION_KEY isn't configured yet the value is stored as-is (with a loud log) so
 * OAuth connect flows keep working during rollout - set the key to turn encryption on.
 */
export function encryptSecret(plaintext: string): string {
  const key = encryptionKey();
  if (!key) {
    console.error("TOKEN_ENCRYPTION_KEY is not set - storing secret unencrypted");
    return plaintext;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${[iv, tag, ciphertext].map((b) => b.toString("base64url")).join(".")}`;
}

/** Reverses encryptSecret. Values without the prefix are legacy plaintext and returned unchanged. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const key = encryptionKey();
  if (!key) throw new Error("Stored secret is encrypted but TOKEN_ENCRYPTION_KEY is not set");
  const [iv, tag, ciphertext] = stored
    .slice(PREFIX.length)
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Deterministic lookup hash for high-entropy bearer tokens (not for passwords). */
export function hashLookupToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

