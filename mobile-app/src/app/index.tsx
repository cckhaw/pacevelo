import { useCallback, useEffect, useState } from "react";
import { Button, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getSyncUrl, isConfigured } from "@/syncPrefs";
import { getStepsToday, hasStepCounterSensor } from "@/steps";
import { postSteps, getStatus, type SyncStatus } from "@/stepsApi";
import { schedulePeriodicSync } from "@/backgroundSync";
import { todayLocalDate, formatChallengeDate, formatSyncTimestamp } from "@/dateFormat";

async function ensureActivityRecognitionPermission() {
  if (Platform.OS !== "android" || Platform.Version < 29) return;
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
}

export default function HomeScreen() {
  const [configured, setConfigured] = useState(false);
  const [sensorAvailable] = useState(() => hasStepCounterSensor());
  const [stepsToday, setStepsToday] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);

  const refreshStatus = useCallback(async (syncUrl: string) => {
    const result = await getStatus(syncUrl);
    if (result) setStatus(result);
  }, []);

  const refreshConfigured = useCallback(async () => {
    const isSet = await isConfigured();
    setConfigured(isSet);
    if (isSet) {
      await schedulePeriodicSync();
      const syncUrl = await getSyncUrl();
      if (syncUrl) await refreshStatus(syncUrl);
    }
  }, [refreshStatus]);

  useEffect(() => {
    void ensureActivityRecognitionPermission();
  }, []);

  // Re-checks every time this screen regains focus, which is what picks up
  // a setup URL just scanned on the /scan screen without needing a
  // callback bridge back from it.
  useFocusEffect(
    useCallback(() => {
      void refreshConfigured();
    }, [refreshConfigured]),
  );

  async function handleSync() {
    const syncUrl = await getSyncUrl();
    if (!syncUrl) return;

    setSyncing(true);
    setSyncResult("Syncing…");
    try {
      const steps = await getStepsToday();
      setStepsToday(steps);
      const today = todayLocalDate();
      const result = await postSteps(syncUrl, today, steps);
      setSyncResult(result.ok ? `Synced ${steps} steps for ${today}.` : `Sync failed: ${result.error}`);
      if (result.ok) await refreshStatus(syncUrl);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>PaceVelo Steps</Text>

      <Text style={styles.setupStatus}>
        {!sensorAvailable
          ? "This device has no step counter sensor."
          : configured
            ? "Set up and reporting to PaceVelo."
            : "Not set up yet"}
      </Text>

      {status ? (
        <View style={styles.statusBlock}>
          <Text style={styles.statusLine}>
            Connected as {status.fullName} ({status.email})
          </Text>
          <Text style={styles.statusLine}>
            {status.challenges.length === 0
              ? "Not currently in an active steps challenge."
              : status.challenges
                  .map((c) => `${c.title} · ${formatChallengeDate(c.startDate)} – ${formatChallengeDate(c.endDate)}`)
                  .join("\n")}
          </Text>
          <Text style={styles.statusLine}>
            {status.lastSync
              ? `Last synced ${formatSyncTimestamp(status.lastSync.updatedAt)} · ${status.lastSync.steps} steps for ${status.lastSync.day}`
              : "No sync recorded yet."}
          </Text>
        </View>
      ) : null}

      <Button title="Scan setup QR code" onPress={() => router.push("/scan")} />

      <Text style={styles.stepsLabel}>Steps today</Text>
      <Text style={styles.stepsValue}>{stepsToday ?? 0}</Text>

      <Button title="Sync now" onPress={handleSync} disabled={!configured || syncing} />

      {syncResult ? <Text style={styles.syncResult}>{syncResult}</Text> : null}

      <Text style={styles.hint}>Syncs automatically in the background too, roughly every 15 minutes.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 32, color: "#0B5A54" },
  setupStatus: { fontSize: 14, textAlign: "center", color: "#1F2937" },
  statusBlock: { alignItems: "center", gap: 4, marginTop: 4 },
  statusLine: { fontSize: 13, textAlign: "center", color: "#4B5563" },
  stepsLabel: { fontSize: 16, marginTop: 36, color: "#1F2937" },
  stepsValue: { fontSize: 48, fontWeight: "bold", color: "#0F766E" },
  syncResult: { fontSize: 13, textAlign: "center", color: "#4B5563" },
  hint: { fontSize: 12, textAlign: "center", color: "#6B7280", marginTop: 24 },
});
