import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Field } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { findByBarcode, normalizeBarcode } from '@/data/findFood';
import { isValidBarcode } from '@/game/nutrition';
import { lookupBarcode, LookupResult } from '@/services/openFoodFacts';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

// Browsers cannot read retail barcodes reliably, so the web build only offers typing the number.
const CAMERA_AVAILABLE = Platform.OS !== 'web';

type Problem = Exclude<LookupResult, { status: 'found' }> & { code: string };

export default function Scan() {
  const { colors, shape } = useTheme();
  const router = useRouter();
  const myFoods = useGame((s) => s.data.myFoods);
  const saveFood = useGame((s) => s.saveFood);
  const recordScan = useGame((s) => s.recordScan);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  // The camera reports the same code many times a second; this lets only the first through.
  const busy = useRef(false);

  const open = (foodId: string) => router.replace({ pathname: '/food-detail', params: { id: foodId } });

  const lookUp = async (raw: string) => {
    if (busy.current) return;
    const code = normalizeBarcode(raw);
    if (!code) return;
    busy.current = true;
    setProblem(null);
    setLoading(true);
    try {
      // A product scanned before is answered from the device, so it works offline.
      const known = findByBarcode(code, myFoods);
      if (known) {
        recordScan();
        open(known.id);
        return;
      }
      const result = await lookupBarcode(code);
      if (result.status === 'found') {
        saveFood(result.food);
        recordScan();
        open(result.food.id);
        return;
      }
      setProblem({ ...result, code });
    } finally {
      setLoading(false);
      busy.current = false;
    }
  };

  const submitTyped = () => {
    const code = typed.replace(/\D/g, '');
    if (!isValidBarcode(code)) {
      setTypedError('That is not a valid barcode number. Check the digits under the bars.');
      return;
    }
    setTypedError(null);
    void lookUp(code);
  };

  const enterByHand = () =>
    router.replace({
      pathname: '/food-custom',
      params: problem ? { barcode: problem.code, ...(problem.status === 'no_nutrition' ? { name: problem.name, brand: problem.brand ?? '' } : {}) } : {},
    });

  const granted = !!permission?.granted;
  const scanning = CAMERA_AVAILABLE && granted && !loading && !problem;

  return (
    <Screen title="Scan barcode" subtitle="UPC and EAN codes on food packaging" back>
      {CAMERA_AVAILABLE && (
        <Panel padded={false}>
          {granted ? (
            <View style={[styles.camera, { borderRadius: shape.panelRadius }]}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                active={scanning}
                barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8'] }}
                onBarcodeScanned={scanning ? ({ data }) => void lookUp(data) : undefined}
              />
              <View pointerEvents="none" style={[styles.reticle, { borderColor: colors.accent }]} />
              <View style={styles.torch}>
                <Btn
                  label={torch ? 'Light off' : 'Light on'}
                  icon={torch ? 'flash-off' : 'flash'}
                  size="sm"
                  variant="secondary"
                  onPress={() => setTorch((t) => !t)}
                />
              </View>
            </View>
          ) : (
            <View style={styles.permission}>
              <Txt variant="heading">Camera access</Txt>
              <Txt color="dim">Achievl uses the camera only to read barcodes. Nothing is recorded or uploaded.</Txt>
              {permission && !permission.canAskAgain ? (
                <Btn label="Open settings" icon="cog" onPress={() => Linking.openSettings()} />
              ) : (
                <Btn label="Allow camera" icon="camera" onPress={() => requestPermission()} />
              )}
            </View>
          )}
        </Panel>
      )}

      {loading && (
        <Panel>
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Txt>Looking it up…</Txt>
          </View>
        </Panel>
      )}

      {problem && (
        <Panel title={problem.status === 'error' ? 'Lookup failed' : 'Not in the database'} icon="alert-circle-outline">
          <View style={styles.block}>
            <Txt>
              {problem.status === 'error'
                ? problem.message
                : problem.status === 'no_nutrition'
                  ? `"${problem.name}" is listed, but without nutrition facts. Enter them from the label and this barcode will work next time.`
                  : `No product found for ${problem.code}. Enter it from the label and this barcode will work next time.`}
            </Txt>
            <View style={styles.buttons}>
              {problem.status === 'error' ? (
                <Btn label="Try again" icon="restore" onPress={() => void lookUp(problem.code)} style={styles.button} />
              ) : (
                <Btn label="Enter by hand" icon="pencil" onPress={enterByHand} style={styles.button} />
              )}
              <Btn label={CAMERA_AVAILABLE ? 'Scan another' : 'Clear'} variant="secondary" onPress={() => setProblem(null)} style={styles.button} />
            </View>
          </View>
        </Panel>
      )}

      <Panel title="Type the number" icon="keyboard">
        <View style={styles.block}>
          <Field
            label="Barcode digits"
            value={typed}
            onChangeText={(text) => {
              setTyped(text);
              setTypedError(null);
            }}
            placeholder="e.g. 737628064502"
            keyboardType="number-pad"
            maxLength={14}
            returnKeyType="search"
            onSubmitEditing={submitTyped}
            hint={typedError ?? (CAMERA_AVAILABLE ? 'Use this if the code will not scan.' : 'Camera scanning is available in the iOS and Android apps.')}
          />
          <Btn label="Look up" icon="magnify" disabled={loading || typed.trim().length === 0} onPress={submitTyped} />
        </View>
      </Panel>

      <Txt variant="caption" color="dim" center>
        Product data comes from Open Food Facts, a free database anyone can improve.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  camera: { height: 260, overflow: 'hidden', backgroundColor: '#000' },
  reticle: { position: 'absolute', left: '10%', right: '10%', top: '32%', bottom: '32%', borderWidth: 3, borderRadius: 10 },
  torch: { position: 'absolute', right: 10, bottom: 10 },
  permission: { padding: 16, gap: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  block: { gap: 12 },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { flex: 1 },
});
