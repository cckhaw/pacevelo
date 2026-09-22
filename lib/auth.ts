import "server-only";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hasBackofficeSession } from "@/lib/backoffice-session";

/**
 * Guards an /admin page: requires a signed-in session whose profile has
 * role = 'admin'. Redirects to the shared /login page otherwise (employees
 * and HR admins sign in from the same screen; it redirects each to the
 * right dashboard by role).
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
  });

  if (!profile || profile.role !== "admin") {
    redirect("/login");
  }

  return { user: { id: profile.id }, profile };
}

/** Returns the signed-in employee's profile, or null if not signed in. */
export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;

  return db.query.profiles.findFirst({ where: eq(profiles.id, session.userId) }) ?? null;
}

/** Guards a /backoffice page: requires the back office session cookie. Redirects to /backoffice/login otherwise. */
export async function requireBackoffice() {
  const ok = await hasBackofficeSession();
  if (!ok) {
    redirect("/backoffice/login");
  }
}
