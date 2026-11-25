/**
 * Resolves a user-supplied post-login destination to a same-origin URL.
 * Only app-relative paths ("/dashboard", "/company/x?welcome=1") are honoured;
 * absolute URLs, protocol-relative ("//evil.com") and backslash tricks
 * ("/\evil.com") fall back to `fallback`. The resolved origin is re-checked
 * against `appUrl` as a second line of defence.
 */
export function resolveSafeRedirect(raw: string | null | undefined, appUrl: string, fallback = "/dashboard"): URL {
  const base = new URL(appUrl);
  const candidate = typeof raw === "string" ? raw : "";
  const looksRelative = candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\");
  if (looksRelative) {
    try {
      const resolved = new URL(candidate, base);
      if (resolved.origin === base.origin) return resolved;
    } catch {
      // fall through
    }
  }
  return new URL(fallback, base);
}

/** Same rule, returning only a safe path+query string (or undefined) - for storing in signed OAuth state. */
export function sanitizeRedirectPath(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return undefined;
  return raw;
}
