import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { Theme } from '@/theme/types';

/** Loops 0 → 1 forever while `active`; used to drive every backdrop animation. */
function useLoop(duration: number, active: boolean): Animated.Value {
  const value = useAnimatedValue(0);
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active, duration, value]);
  return value;
}

/** Small repeatable pseudo-random sequence so decorations sit in the same place every render. */
function seeded(count: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i += 1) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    out.push(s / 4294967296);
  }
  return out;
}

/** HD era: slow concentric rings glowing behind brushed silver. */
function Rings({ theme, active }: { theme: Theme; active: boolean }) {
  const { width } = useWindowDimensions();
  const t = useLoop(26000, active);
  const base = Math.max(width, 360);
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulse = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.06, 1] });
  return (
    <Animated.View style={[styles.ringsAnchor, { transform: [{ rotate }, { scale: pulse }] }]}>
      {[1.5, 1.15, 0.82, 0.5].map((k, i) => (
        <View
          key={k}
          style={{
            position: 'absolute',
            width: base * k,
            height: base * k,
            borderRadius: (base * k) / 2,
            borderWidth: i % 2 === 0 ? 26 : 10,
            borderColor: i % 2 === 0 ? theme.colors.backdropA : theme.colors.backdropB,
            // An off-centre ring reads as a swirl once it rotates.
            left: -(base * k) / 2 + i * 14,
            top: -(base * k) / 2 - i * 10,
          }}
        />
      ))}
    </Animated.View>
  );
}

/** HD era: a translucent ribbon drifting sideways across midnight blue. */
function Ribbon({ theme, active }: { theme: Theme; active: boolean }) {
  const { width, height } = useWindowDimensions();
  const slow = useLoop(32000, active);
  const fast = useLoop(21000, active);
  const w = Math.max(width, 320);
  // Each path spans two screen widths and repeats exactly, so sliding it by one width loops seamlessly.
  const band = (amp: number, thick: number) => {
    const y = 120;
    const q = w / 4;
    const top = `M0 ${y} C ${q} ${y - amp}, ${q} ${y + amp}, ${2 * q} ${y} S ${3 * q} ${y - amp}, ${w} ${y} S ${5 * q} ${y + amp}, ${6 * q} ${y} S ${7 * q} ${y - amp}, ${2 * w} ${y}`;
    const y2 = y + thick;
    const bottom = `L ${2 * w} ${y2} C ${7 * q} ${y2 - amp * 0.6}, ${7 * q} ${y2 + amp * 0.6}, ${6 * q} ${y2} S ${5 * q} ${y2 - amp * 0.6}, ${w} ${y2} S ${3 * q} ${y2 + amp * 0.6}, ${2 * q} ${y2} S ${q} ${y2 - amp * 0.6}, 0 ${y2} Z`;
    return top + bottom;
  };
  const layer = (t: Animated.Value, top: number, amp: number, thick: number, fill: string) => (
    <Animated.View style={{ position: 'absolute', left: 0, top, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, -w] }) }] }}>
      <Svg width={2 * w} height={260}>
        <Path d={band(amp, thick)} fill={fill} />
      </Svg>
    </Animated.View>
  );
  return (
    <>
      {layer(slow, height * 0.34, 70, 46, theme.colors.backdropB)}
      {layer(fast, height * 0.4, 48, 26, theme.colors.backdropA)}
    </>
  );
}

/** Y2K era: glass cubes floating up through the fog. */
function Cubes({ theme, active }: { theme: Theme; active: boolean }) {
  const { width, height } = useWindowDimensions();
  const t = useLoop(30000, active);
  const cubes = useMemo(() => {
    const r = seeded(40, 7);
    return Array.from({ length: 10 }, (_, i) => ({
      x: r[i * 4] * width,
      size: 26 + r[i * 4 + 1] * 70,
      // Kept away from 0 and 1 so the loop's wrap point is always inside the animation.
      phase: 0.05 + r[i * 4 + 2] * 0.9,
      spin: r[i * 4 + 3] > 0.5 ? 1 : -1,
    }));
  }, [width]);
  return (
    <>
      {cubes.map((c, i) => {
        // Each cube rises one screen-and-a-bit per loop, offset by its own phase.
        const translateY = t.interpolate({
          inputRange: [0, 1 - c.phase, 1 - c.phase + 0.0001, 1],
          outputRange: [height * (1 - c.phase) + c.size, -c.size * 2, height + c.size, height * (1 - c.phase) + c.size],
        });
        const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${c.spin * 180}deg`] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: c.x - c.size / 2,
              top: 0,
              width: c.size,
              height: c.size,
              borderWidth: 1,
              borderColor: i % 2 ? theme.colors.backdropA : theme.colors.backdropB,
              backgroundColor: i % 2 ? 'rgba(77,208,225,0.05)' : 'rgba(120,110,255,0.06)',
              transform: [{ translateY }, { rotate }],
            }}
          />
        );
      })}
    </>
  );
}

/** 16-bit era: square stars that twinkle in three groups. */
function Stars({ theme, active }: { theme: Theme; active: boolean }) {
  const { width, height } = useWindowDimensions();
  const t = useLoop(4200, active);
  const stars = useMemo(() => {
    const r = seeded(144, 11);
    return Array.from({ length: 48 }, (_, i) => ({ x: r[i * 3] * width, y: r[i * 3 + 1] * height, size: r[i * 3 + 2] > 0.8 ? 4 : 2, group: i % 3 }));
  }, [width, height]);
  const opacities = [
    t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.9, 0.25, 0.6, 0.9] }),
    t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.3, 0.9, 0.3, 0.3] }),
    t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.6, 0.4, 0.95, 0.6] }),
  ];
  return (
    <>
      {[0, 1, 2].map((group) => (
        <Animated.View key={group} style={[StyleSheet.absoluteFill, { opacity: opacities[group] }]}>
          {stars
            .filter((s) => s.group === group)
            .map((s, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: s.x,
                  top: s.y,
                  width: s.size,
                  height: s.size,
                  backgroundColor: i % 7 === 0 ? theme.colors.backdropB : theme.colors.backdropA,
                }}
              />
            ))}
        </Animated.View>
      ))}
    </>
  );
}

/** Handheld era: the dot-matrix grid of an unlit LCD. 8-bit era: CRT scanlines. */
function Texture({ theme, kind }: { theme: Theme; kind: 'dots' | 'scanlines' }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="tex" width={4} height={4} patternUnits="userSpaceOnUse">
          {kind === 'dots' ? (
            <Rect x={0} y={0} width={3} height={3} fill={theme.colors.backdropA} />
          ) : (
            <Rect x={0} y={0} width={4} height={2} fill={theme.colors.backdropA} />
          )}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#tex)" />
    </Svg>
  );
}

/** Full-screen background for the current era. Animations pause while the screen is not in view. */
export function EraBackdrop() {
  const theme = useTheme();
  const focused = useIsFocused();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <LinearGradient colors={theme.colors.bgGradient} style={StyleSheet.absoluteFill} />
      {theme.backdrop === 'rings' && <Rings theme={theme} active={focused} />}
      {theme.backdrop === 'ribbon' && <Ribbon theme={theme} active={focused} />}
      {theme.backdrop === 'cubes' && <Cubes theme={theme} active={focused} />}
      {theme.backdrop === 'stars' && <Stars theme={theme} active={focused} />}
      {(theme.backdrop === 'dots' || theme.backdrop === 'scanlines') && <Texture theme={theme} kind={theme.backdrop} />}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  ringsAnchor: { position: 'absolute', right: 30, top: 110, width: 0, height: 0 },
});
