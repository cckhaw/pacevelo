import "../backgroundSync";
import { Stack } from "expo-router";

/**
 * Importing "../backgroundSync" above (for its side effect of calling
 * TaskManager.defineTask) is what makes the background sync task
 * rediscoverable on a cold background launch, not just while the app is
 * open - this file is guaranteed to load on every app start since it's
 * the router's root layout.
 */
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", headerShown: false }} />
    </Stack>
  );
}
