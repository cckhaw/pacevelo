"use server";

import { redirect } from "next/navigation";
import {
  createBackofficeSession,
  isBackofficeIpAllowed,
  verifyBackofficeCredentials,
  verifyBackofficeTotp,
} from "@/lib/backoffice-session";
import {
  getClientIp,
  consumeRateLimit,
  isRateLimited,
  resetRateLimit,
  safely,
  tooManyMessage,
  RATE_RULES,
} from "@/lib/rate-limit";

export interface BackofficeLoginState {
  error?: string;
}

const FAILURE_KEY = "backoffice:fail:global";

export async function signInBackoffice(
  _prevState: BackofficeLoginState,
  formData: FormData,
): Promise<BackofficeLoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const totp = String(formData.get("totp") ?? "").trim();

  const ip = await getClientIp();
  if (!isBackofficeIpAllowed(ip)) {
    return { error: "Incorrect username or password." };
  }

  // The back office has a single shared credential, so failures are locked
  // out globally (not just per IP) - an attacker rotating IPs still hits it.
  const open = { ok: true, retryAfterSeconds: 0 };
  const ipCheck = await safely(() => consumeRateLimit(`backoffice:ip:${ip}`, RATE_RULES.backofficeIp), open);
  const lockCheck = await safely(() => isRateLimited(FAILURE_KEY, RATE_RULES.backofficeFailures), open);
  if (!ipCheck.ok || !lockCheck.ok) {
    return { error: tooManyMessage(Math.max(ipCheck.retryAfterSeconds, lockCheck.retryAfterSeconds)) };
  }

  const ok =
    Boolean(username && password) &&
    verifyBackofficeCredentials(username, password) &&
    verifyBackofficeTotp(totp);
  if (!ok) {
    await safely(() => consumeRateLimit(FAILURE_KEY, RATE_RULES.backofficeFailures), open);
    return { error: "Incorrect username, password or authentication code." };
  }

  await safely(() => resetRateLimit(FAILURE_KEY), undefined);
  await createBackofficeSession();
  redirect("/backoffice");
}
