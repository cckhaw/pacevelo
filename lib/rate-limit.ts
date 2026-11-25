import "server-only";

import { headers } from "next/headers";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

export interface RateLimitRule {
  /** Max hits allowed per window. */
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** Best-effort client IP. Vercel sets x-forwarded-for / x-real-ip itself, so the first hop is trustworthy there. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/** Normalises an account identifier so "A@x.com" and "a@x.com" share one bucket. */
export function accountKey(scope: string, identifier: string): string {
  return `${scope}:${identifier.trim().toLowerCase()}`;
}

/** Atomically records one hit against `key` and reports whether it is still within `rule`. */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const window = sql.raw(`interval '${Math.floor(rule.windowSeconds)} seconds'`);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} < now() - ${window} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimits.windowStart} < now() - ${window} THEN now() ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

  const elapsed = (Date.now() - row.windowStart.getTime()) / 1000;
  return {
    ok: row.count <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil(rule.windowSeconds - elapsed)),
  };
}

/** Read-only check: is `key` already over `rule` (without counting a new hit)? Used for failure-based lockouts. */
export async function isRateLimited(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const row = await db.query.rateLimits.findFirst({ where: eq(rateLimits.key, key) });
  if (!row) return { ok: true, retryAfterSeconds: 0 };
  const elapsed = (Date.now() - row.windowStart.getTime()) / 1000;
  if (elapsed >= rule.windowSeconds) return { ok: true, retryAfterSeconds: 0 };
  return {
    ok: row.count < rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil(rule.windowSeconds - elapsed)),
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

/**
 * Fail-open wrapper: if the limiter's own storage is unavailable (e.g. the
 * migration hasn't run yet) we log and allow rather than lock everyone out.
 */
export async function safely<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("Rate limiter unavailable", err);
    return fallback;
  }
}

export function tooManyMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export const RATE_RULES = {
  loginIp: { limit: 30, windowSeconds: 15 * 60 },
  loginAccountFailures: { limit: 8, windowSeconds: 15 * 60 },
  backofficeIp: { limit: 10, windowSeconds: 15 * 60 },
  backofficeFailures: { limit: 5, windowSeconds: 30 * 60 },
  otpRequestEmail: { limit: 3, windowSeconds: 15 * 60 },
  otpRequestIp: { limit: 10, windowSeconds: 15 * 60 },
  otpVerifyEmail: { limit: 10, windowSeconds: 30 * 60 },
  forgotEmail: { limit: 3, windowSeconds: 30 * 60 },
  forgotIp: { limit: 10, windowSeconds: 30 * 60 },
  resetIp: { limit: 20, windowSeconds: 30 * 60 },
} satisfies Record<string, RateLimitRule>;
