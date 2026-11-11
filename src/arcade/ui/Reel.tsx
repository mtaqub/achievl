import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useTheme } from '@/theme/ThemeProvider';

import { Spin, WIN_INDEX } from '../rules';
import { CrateItem } from '../types';
import { tick } from './feedback';
import { Tile, TILE_H, TILE_W } from './Tile';

const GAP = 6;
const STEP = TILE_W + GAP;
const SPIN_MS = 6400;
/** Tile under the marker before a spin starts. */
const START_INDEX = 3;

export interface ReelProps {
  /** The current opening. A new object starts a new spin. */
  spin: Spin | null;
  /** Shown before the first spin. */
  preview: CrateItem[];
  /** Jump straight to the result. */
  quick?: boolean;
  onStop: () => void;
}

/**
 * The spinning strip of a crate opening: it starts fast, slows for a long time and
 * stops with the winning tile under the centre marker.
 */
export function Reel({ spin, preview, quick, onStop }: ReelProps) {
  const { colors, shape } = useTheme();
  const [width, setWidth] = useState(0);
  const x = useAnimatedValue(0);
  const stop = useRef(onStop);
  useEffect(() => {
    stop.current = onStop;
  });

  const items = spin?.reel ?? preview;

  useEffect(() => {
    if (width === 0) return;
    const offset = (index: number, nudge: number) => width / 2 - (index * STEP + TILE_W / 2) - nudge * TILE_W;
    if (!spin) {
      x.setValue(offset(START_INDEX, 0));
      return;
    }
    const end = offset(WIN_INDEX, spin.nudge);
    if (quick) {
      x.setValue(end);
      stop.current();
      return;
    }
    x.setValue(offset(START_INDEX, 0));
    let last = START_INDEX;
    const listener = x.addListener(({ value }) => {
      const under = Math.floor((width / 2 - value) / STEP);
      if (under !== last) {
        last = under;
        tick();
      }
    });
    const run = Animated.timing(x, {
      toValue: end,
      duration: SPIN_MS,
      // Most of the distance goes by in the first second; the rest is the long crawl to a stop.
      easing: Easing.bezier(0.08, 0.62, 0.04, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    run.start(({ finished }) => {
      if (finished) stop.current();
    });
    return () => {
      run.stop();
      x.removeListener(listener);
    };
  }, [spin, width, quick, x]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.window, { borderRadius: shape.radius, borderColor: colors.insetBorder }]}
      accessibilityLabel="Crate reel">
      {width > 0 && (
        <Animated.View style={[styles.strip, { transform: [{ translateX: x }] }]}>
          {items.map((item, i) => (
            <Tile key={`${spin?.drop.uid ?? 'preview'}-${i}`} item={item} uid={`reel-${i}`} />
          ))}
        </Animated.View>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(12,13,16,0.9)', 'rgba(12,13,16,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fade, styles.left]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(12,13,16,0)', 'rgba(12,13,16,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fade, styles.right]}
      />
      <View pointerEvents="none" style={styles.marker}>
        <View style={[styles.notch, styles.notchTop, { borderTopColor: colors.gold }]} />
        <View style={[styles.line, { backgroundColor: colors.gold }]} />
        <View style={[styles.notch, styles.notchBottom, { borderBottomColor: colors.gold }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { height: TILE_H + 20, overflow: 'hidden', backgroundColor: '#0C0D10', borderWidth: 1, justifyContent: 'center' },
  strip: { flexDirection: 'row', gap: GAP, position: 'absolute', left: 0, top: 10 },
  fade: { position: 'absolute', top: 0, bottom: 0, width: '22%' },
  left: { left: 0 },
  right: { right: 0 },
  marker: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 14, marginLeft: -7, alignItems: 'center' },
  line: { flex: 1, width: 2, opacity: 0.95 },
  notch: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  notchTop: { borderTopWidth: 8 },
  notchBottom: { borderBottomWidth: 8 },
});
