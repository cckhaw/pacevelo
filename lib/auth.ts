import "server-only";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/session";

/**
 * Guards an /admin page: requires a signed-in session whose profile has
 * role = 'admin'. Redirects to /admin/login otherwise.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
  });

  if (!profile || profile.role !== "admin") {
    redirect("/admin/login");
  }

  return { user: { id: profile.id }, profile };
}

/** Returns the signed-in employee's profile, or null if not signed in. */
export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;

  return db.query.profiles.findFirst({ where: eq(profiles.id, session.userId) }) ?? null;
}
