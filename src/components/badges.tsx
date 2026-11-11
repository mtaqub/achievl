import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Tier } from '@/game/milestones';
import { Grade } from '@/game/nutrition';
import { Rank } from '@/game/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Theme } from '@/theme/types';

import { Gloss } from './Panel';
import { Txt } from './Txt';

export function gradeColor(theme: Theme, grade: Grade): string {
  const { colors } = theme;
  switch (grade) {
    case 'S':
      return colors.gold;
    case 'A':
      return colors.xp;
    case 'B':
      return colors.water;
    case 'C':
      return colors.textDim;
    case 'D':
      return colors.food;
    case 'E':
      return colors.danger;
  }
}

export function tierColor(theme: Theme, tier: Tier): string {
  return theme.colors[tier];
}

/** Letter grade for a food: S (best) to E. */
export function GradeBadge({ grade, size = 30 }: { grade: Grade; size?: number }) {
  const theme = useTheme();
  const color = gradeColor(theme, grade);
  return (
    <View
      accessibilityLabel={`Grade ${grade}`}
      style={[
        styles.box,
        { width: size, height: size, borderRadius: Math.min(theme.shape.radius, size / 3), borderColor: color, backgroundColor: theme.colors.inset },
      ]}>
      <Txt variant="number" size={size * 0.52} color={color}>
        {grade}
      </Txt>
    </View>
  );
}

/** The player's rank emblem, E to S. */
export function RankBadge({ rank, size = 44 }: { rank: Rank; size?: number }) {
  const { colors, shape } = useTheme();
  const radius = shape.radius === 0 ? 0 : size / 2;
  return (
    <View accessibilityLabel={`Rank ${rank}`} style={{ width: size, height: size }}>
      <LinearGradient
        colors={colors.accentGradient}
        style={[styles.box, { width: size, height: size, borderRadius: radius, borderColor: colors.panelBorder, overflow: 'hidden' }]}>
        {shape.gloss && <Gloss radius={radius} strength={0.5} />}
        <Txt variant="number" size={size * 0.5} color={colors.accentText}>
          {rank}
        </Txt>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
