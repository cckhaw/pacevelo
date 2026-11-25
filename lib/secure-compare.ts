import "server-only";

import { createHash, timingSafeEqual } from "crypto";

/** Constant-time string equality (hashes first so differing lengths don't leak or throw). */
export function secureEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
