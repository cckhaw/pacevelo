"use server";

import { redirect } from "next/navigation";
import { createBackofficeSession, verifyBackofficeCredentials } from "@/lib/backoffice-session";

export interface BackofficeLoginState {
  error?: string;
}

export async function signInBackoffice(
  _prevState: BackofficeLoginState,
  formData: FormData,
): Promise<BackofficeLoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username || !password || !verifyBackofficeCredentials(username, password)) {
    return { error: "Incorrect username or password." };
  }

  await createBackofficeSession();
  redirect("/backoffice");
}
