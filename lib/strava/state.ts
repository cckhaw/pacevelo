import "server-only";

export interface StravaOAuthState {
  nonce: string;
  companySlug?: string;
  redirectTo?: string;
  existingUserId?: string;
}

export function encodeStravaState(state: StravaOAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

export function decodeStravaState(raw: string): StravaOAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed?.nonce !== "string") return null;
    return parsed as StravaOAuthState;
  } catch {
    return null;
  }
}
