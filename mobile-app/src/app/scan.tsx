import { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { setSyncUrl } from "@/syncPrefs";
import { schedulePeriodicSync } from "@/backgroundSync";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleScan({ data }: BarcodeScanningResult) {
    // Guard against onBarcodeScanned firing multiple times for the same
    // code while the camera keeps scanning during the async work below.
    if (handled) return;

    if (!data.startsWith("http") || !data.includes("token=")) {
      setError("That QR code doesn't look like a PaceVelo setup code.");
      return;
    }

    setHandled(true);
    await setSyncUrl(data);
    await schedulePeriodicSync();
    router.back();
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>PaceVelo needs camera access to scan your setup QR code.</Text>
        <Button title="Grant camera permission" onPress={requestPermission} />
        <Button title="Cancel" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handled ? undefined : handleScan}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Scan the setup QR code from your PaceVelo dashboard</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button title="Cancel" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  overlay: { position: "absolute", bottom: 48, left: 24, right: 24, alignItems: "center", gap: 8 },
  overlayText: { color: "white", textAlign: "center", fontSize: 14 },
  message: { color: "white", textAlign: "center", fontSize: 14, marginBottom: 8 },
  errorText: { color: "#fca5a5", textAlign: "center", fontSize: 13 },
});
