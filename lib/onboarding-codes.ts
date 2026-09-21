import "server-only";

import { randomBytes } from "crypto";
import { db } from "@/db";
import { onboardingCodes } from "@/db/schema";

// Excludes 0/O/1/I so a printed or read-aloud code can't be misread.
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

function randomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  return out;
}

/** Generates and stores a new single-use onboarding code. `challengeLimit` of null means unlimited challenges. */
export async function createOnboardingCode(challengeLimit: number | null) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await db.query.onboardingCodes.findFirst({
      where: (t, { eq }) => eq(t.code, code),
      columns: { id: true },
    });
    if (existing) continue;

    const [created] = await db.insert(onboardingCodes).values({ code, challengeLimit }).returning();
    return created;
  }
  throw new Error("Could not generate a unique onboarding code, please try again.");
}
