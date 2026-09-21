import "server-only";

/** Shared HMAC key for every JWT this app signs (session, OAuth state, password reset, back office session). */
export function sessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET env var must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}
