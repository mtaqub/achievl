import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, useAnimatedValue, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Icon } from './Icon';
import { Txt } from './Txt';

const SEGMENTS = 12;

export interface BarProps {
  /** 0–1; anything above 1 shows as full. */
  value: number;
  color: string;
  height?: number;
  /** 0–1 marker for where the bar should be by now. */
  pace?: number;
}

/** A progress bar drawn in the era's style: glossy tube, block segments or flat. */
export function Bar({ value, color, height = 14, pace }: BarProps) {
  const { colors, shape } = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const anim = useAnimatedValue(clamped);

  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 450, useNativeDriver: false }).start();
  }, [anim, clamped]);

  const paceMark =
    pace !== undefined && pace > 0 && pace < 1 ? (
      <View pointerEvents="none" style={[styles.pace, { left: `${pace * 100}%`, backgroundColor: colors.text }]} />
    ) : null;

  if (shape.meter === 'segments') {
    const lit = Math.round(clamped * SEGMENTS);
    return (
      <View style={[styles.segments, { height }]}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < lit ? color : colors.inset, borderColor: colors.insetBorder, borderWidth: i < lit ? 0 : 1 }]}
          />
        ))}
        {paceMark}
      </View>
    );
  }

  const radius = shape.meter === 'gloss' ? height / 2 : Math.min(shape.radius, height / 2);
  return (
    <View style={[styles.track, { height, borderRadius: radius, backgroundColor: colors.inset, borderColor: colors.insetBorder }]}>
      <Animated.View
        style={[styles.fill, { borderRadius: radius, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
        {shape.meter === 'gloss' && <LinearGradient colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.05)']} style={styles.fillGloss} />}
      </Animated.View>
      {paceMark}
    </View>
  );
}

export interface MeterProps extends BarProps {
  label: string;
  icon: string;
  /** Right-aligned readout, e.g. "1.2 / 2 L". */
  readout: string;
}

export function Meter({ label, icon, readout, ...bar }: MeterProps) {
  return (
    <View style={styles.meter} accessible accessibilityLabel={`${label}: ${readout}`}>
      <View style={styles.meterHead}>
        <Icon name={icon} size={16} color={bar.color} />
        <Txt variant="label" style={styles.meterLabel}>
          {label}
        </Txt>
        <Txt variant="caption" color="dim">
          {readout}
        </Txt>
      </View>
      <Bar {...bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderWidth: 1, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  fillGloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%' },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1 },
  pace: { position: 'absolute', top: -2, bottom: -2, width: 2, opacity: 0.55 },
  meter: { gap: 6 },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meterLabel: { flex: 1 },
});
