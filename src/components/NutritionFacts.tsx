import React from 'react';
import { StyleSheet, View } from 'react-native';

import { round2 } from '@/game/leveling';
import { Nutrients } from '@/game/types';
import { useTheme } from '@/theme/ThemeProvider';

import { Txt } from './Txt';

const ROWS: { key: keyof Nutrients; label: string; unit: string; sub?: boolean }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fiber', label: 'Fibre', unit: 'g', sub: true },
  { key: 'sugar', label: 'Sugar', unit: 'g', sub: true },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'satFat', label: 'Saturated', unit: 'g', sub: true },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
];

const show = (value: number, unit: string) => `${unit === 'g' ? round2(Math.round(value * 10) / 10) : Math.round(value)} ${unit}`;

/** The basic nutrition label for a food or a day's total. */
export function NutritionFacts({ nutrients }: { nutrients: Nutrients }) {
  const { colors } = useTheme();
  return (
    <View>
      {ROWS.map((row, i) => (
        <View
          key={row.key}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.insetBorder }, row.sub && styles.sub]}>
          <Txt variant={row.sub ? 'body' : 'bodyStrong'} color={row.sub ? 'dim' : 'text'}>
            {row.label}
          </Txt>
          <Txt variant={row.sub ? 'body' : 'bodyStrong'} color={row.sub ? 'dim' : 'text'}>
            {show(nutrients[row.key], row.unit)}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sub: { paddingLeft: 16 },
});
