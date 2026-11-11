import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { useTheme } from '@/theme/ThemeProvider';

import { Btn } from './Btn';
import { Panel } from './Panel';
import { Txt } from './Txt';

export interface DialogSpec {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

const useDialog = create<{ current: DialogSpec | null }>(() => ({ current: null }));

/** Asks the player to confirm something. Works the same on iOS, Android and web. */
export function confirm(spec: DialogSpec) {
  useDialog.setState({ current: spec });
}

export function DialogHost() {
  const { colors } = useTheme();
  const spec = useDialog((s) => s.current);
  const close = () => useDialog.setState({ current: null });

  return (
    <Modal visible={!!spec} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable accessibilityLabel="Dismiss" style={[styles.scrim, { backgroundColor: colors.overlay }]} onPress={close}>
        {/* Stops taps inside the box from closing it. */}
        <Pressable style={styles.box} onPress={() => {}} accessible={false}>
          {spec && (
            <Panel title={spec.title} icon={spec.danger ? 'alert-circle-outline' : 'help-circle-outline'}>
              <View style={styles.content}>
                <Txt>{spec.message}</Txt>
                <View style={styles.buttons}>
                  <Btn label={spec.cancelLabel ?? 'Cancel'} variant="secondary" onPress={close} style={styles.button} />
                  <Btn
                    label={spec.confirmLabel}
                    variant={spec.danger ? 'danger' : 'primary'}
                    onPress={() => {
                      close();
                      spec.onConfirm();
                    }}
                    style={styles.button}
                  />
                </View>
              </View>
            </Panel>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 400 },
  content: { gap: 16 },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
});
