"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, clearSession } from "@/lib/session";
import { emailSchema, passwordSchema, passwordsMatch } from "@/lib/validations";

export interface AuthActionState {
  error?: string;
}

const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export async function signUpAdmin(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!fullName) {
    return { error: "Enter your full name" };
  }
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!passwordsMatch(formData.get("password"), formData.get("confirmPassword"))) {
    return { error: "Passwords don't match." };
  }

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.email, parsed.data.email),
    columns: { id: true },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const [created] = await db
    .insert(profiles)
    .values({
      email: parsed.data.email,
      passwordHash,
      fullName,
      role: "admin",
    })
    .returning({ id: profiles.id });

  await createSession({ userId: created.id, role: "admin" });
  redirect("/admin/company");
}

export async function signInAdmin(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.email, parsed.data.email),
    columns: { id: true, role: true, passwordHash: true },
  });

  if (!profile?.passwordHash || profile.role !== "admin") {
    return { error: "Incorrect email or password." };
  }

  const valid = await verifyPassword(parsed.data.password, profile.passwordHash);
  if (!valid) {
    return { error: "Incorrect email or password." };
  }

  await createSession({ userId: profile.id, role: profile.role });
  redirect("/admin");
}

export async function signOutAdmin() {
  await clearSession();
  redirect("/");
}
