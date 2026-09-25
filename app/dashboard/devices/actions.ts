"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { regenerateDeviceSyncToken } from "@/lib/device-sync";

export interface RegenerateDeviceSyncTokenState {
  error?: string;
  token?: string;
}

/** Issues a fresh device sync token - any Shortcut/app still configured with the old one stops working immediately. */
export async function regenerateDeviceSyncTokenAction(): Promise<RegenerateDeviceSyncTokenState> {
  const session = await getSession();
  if (!session) return { error: "You're not signed in." };

  const token = await regenerateDeviceSyncToken(session.userId);
  revalidatePath("/dashboard/devices");
  return { token };
}
