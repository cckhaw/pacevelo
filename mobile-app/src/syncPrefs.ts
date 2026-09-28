import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local device storage for the scanned setup URL - the same personal
 * dashboard URL /dashboard/devices shows for the iOS Shortcut, already
 * carrying the profile's bearer token as a query param. Ported from the
 * native app's SyncPrefs.kt (SharedPreferences -> AsyncStorage).
 */
const SYNC_URL_KEY = "pacevelo.syncUrl";

export async function getSyncUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SYNC_URL_KEY);
}

export async function setSyncUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SYNC_URL_KEY, url);
}

export async function isConfigured(): Promise<boolean> {
  const url = await getSyncUrl();
  return Boolean(url && url.trim());
}
