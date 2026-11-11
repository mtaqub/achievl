import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { STAT_KEYS, Stats } from '@/game/types';
import { useTheme } from '@/theme/ThemeProvider';

import { Txt } from './Txt';

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 74;
const LABEL_RADIUS = RADIUS + 24;

const point = (index: number, radius: number) => {
  const angle = (Math.PI * 2 * index) / STAT_KEYS.length - Math.PI / 2;
  return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
};
const ring = (radius: number) =>
  STAT_KEYS.map((_, i) => point(i, radius))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

/** Six-sided chart of the player's stats. The scale grows with the highest stat. */
export function StatRadar({ stats }: { stats: Stats }) {
  const { colors } = useTheme();
  const top = Math.max(10, ...STAT_KEYS.map((k) => stats[k]));
  // A sliver is always drawn so a new player still sees a shape.
  const shape = STAT_KEYS.map((k, i) => point(i, RADIUS * Math.max(0.06, stats[k] / top)))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Stats: ${STAT_KEYS.map((k) => `${k} ${Math.floor(stats[k])}`).join(', ')}`}>
      <Svg width={SIZE} height={SIZE}>
        {[1, 0.66, 0.33].map((k) => (
          <Polygon key={k} points={ring(RADIUS * k)} fill="none" stroke={colors.insetBorder} strokeWidth={1} />
        ))}
        {STAT_KEYS.map((key, i) => {
          const edge = point(i, RADIUS);
          return <Line key={key} x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} stroke={colors.insetBorder} strokeWidth={1} />;
        })}
        <Polygon points={shape} fill={colors.accent} fillOpacity={0.3} stroke={colors.accent} strokeWidth={2} />
        {STAT_KEYS.map((key, i) => {
          const p = point(i, RADIUS * Math.max(0.06, stats[key] / top));
          return <Circle key={key} cx={p.x} cy={p.y} r={3} fill={colors.accent} />;
        })}
      </Svg>
      {STAT_KEYS.map((key, i) => {
        const p = point(i, LABEL_RADIUS);
        return (
          <View key={key} style={[styles.label, { left: p.x - 30, top: p.y - 16 }]}>
            <Txt variant="label" size={10} color="dim" center>
              {key}
            </Txt>
            <Txt variant="heading" size={13} center>
              {Math.floor(stats[key])}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  label: { position: 'absolute', width: 60, alignItems: 'center' },
});
