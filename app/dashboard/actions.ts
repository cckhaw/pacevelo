"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getValidStravaAccessToken } from "@/lib/strava/tokens";
import { deauthorizeStrava } from "@/lib/strava/client";

export interface DisconnectStravaState {
  error?: string;
}

/** Unlinks Strava from the signed-in profile, freeing that Strava account to be connected to a different PaceVelo profile. */
export async function disconnectStrava(): Promise<DisconnectStravaState> {
  const session = await getSession();
  if (!session) return { error: "You're not signed in." };

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
    columns: { stravaAthleteId: true },
  });
  if (!profile?.stravaAthleteId) {
    return { error: "No Strava account is connected." };
  }

  try {
    const accessToken = await getValidStravaAccessToken(session.userId);
    await deauthorizeStrava(accessToken);
  } catch (err) {
    // Still unlink locally even if revoking with Strava fails (e.g. the
    // token was already invalid) - the important part is freeing this
    // athlete ID up for a different profile to connect.
    console.error("Failed to revoke Strava access during disconnect", err);
  }

  await db
    .update(profiles)
    .set({
      stravaAthleteId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiresAt: null,
    })
    .where(eq(profiles.id, session.userId));

  revalidatePath("/dashboard");
  return {};
}
