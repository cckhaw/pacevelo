"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { emailSchema, passwordSchema } from "@/lib/validations";

export interface LoginActionState {
  error?: string;
}

const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema });

export async function signIn(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.email, parsed.data.email) });
  if (!profile?.passwordHash) {
    return { error: "Incorrect email or password." };
  }

  const valid = await verifyPassword(parsed.data.password, profile.passwordHash);
  if (!valid) {
    return { error: "Incorrect email or password." };
  }

  await createSession({ userId: profile.id, role: profile.role });
  redirect(profile.role === "admin" ? "/admin" : "/dashboard");
}
