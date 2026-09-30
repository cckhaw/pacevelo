/**
 * Accounts created straight from a Strava sign-in (no email verification)
 * get a stand-in address, since profiles.email is required and unique. It
 * can't receive mail or be logged in with, so anything that needs a real
 * address has to check for it.
 */
const PLACEHOLDER_EMAIL_DOMAIN = "users.pacevelo.app";

export function placeholderEmailForStrava(athleteId: number): string {
  return `strava-${athleteId}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}
