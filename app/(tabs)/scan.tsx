import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={38} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.subtitle}>Allow your camera to scan event QR codes.</Text>
        <AppButton theme="primary" title="Grant Permission" icon="camera" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setLastData(data);
    if (!user) {
      setMessage('Please sign in before scanning.');
      setSuccess(false);
      return;
    }
    registerAttendance(data, user.id)
      .then((result) => {
        setMessage(result.message);
        setSuccess(result.success);
      })
      .catch((caughtError) => {
        setMessage(caughtError instanceof Error ? caughtError.message : 'Could not record attendance.');
        setSuccess(false);
      });
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setMessage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        style={styles.camera}
      />

      <View style={styles.scanFrame}>
        <View style={styles.corner} />
        <View style={styles.corner} />
        <View style={styles.corner} />
        <View style={styles.corner} />
      </View>

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>{scanned ? 'QR code detected' : 'Point the camera at an event QR code'}</Text>
        {scanned && message ? (
          <Text style={[styles.scanResult, success ? styles.success : styles.error]}>{message}</Text>
        ) : null}
        {scanned && lastData ? <Text style={styles.scanData}>{lastData}</Text> : null}
        {scanned ? <AppButton theme="primary" title="Scan Again" icon="refresh" onPress={handleScanAgain} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: COLORS.textPrimary, flex: 1, justifyContent: 'center' },
  camera: { ...StyleSheet.absoluteFillObject },
  permissionContainer: { alignItems: 'center', backgroundColor: COLORS.background, flex: 1, justifyContent: 'center', padding: 28 },
  permissionIcon: { alignItems: 'center', backgroundColor: COLORS.primarySoft, borderRadius: 24, height: 76, justifyContent: 'center', marginBottom: 24, width: 76 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 21, marginBottom: 24, textAlign: 'center' },
  scanFrame: { borderColor: COLORS.textOnPrimary, borderRadius: 12, borderWidth: 2, height: 260, left: '50%', opacity: 0.8, position: 'absolute', top: '50%', transform: [{ translateX: -130 }, { translateY: -130 }], width: 260 },
  corner: { borderColor: COLORS.textOnPrimary, borderStyle: 'solid', borderTopColor: COLORS.textOnPrimary, borderTopWidth: 4, height: 26, position: 'absolute', width: 26 },
  overlay: { alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 18, bottom: 28, left: 24, padding: 16, position: 'absolute', right: 24, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16 },
  overlayText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  scanResult: { fontSize: 13, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  success: { color: COLORS.success },
  error: { color: COLORS.danger },
  scanData: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 8, textAlign: 'center' },
});