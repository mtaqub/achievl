import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Theme } from '@/theme/types';

export type TxtVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'number';

const BASE: Record<TxtVariant, { size: number; font: 'display' | 'body' | 'number'; strong: boolean; label?: boolean }> = {
  display: { size: 30, font: 'display', strong: true },
  title: { size: 22, font: 'display', strong: true },
  heading: { size: 16, font: 'display', strong: true },
  body: { size: 15, font: 'body', strong: false },
  bodyStrong: { size: 15, font: 'body', strong: true },
  label: { size: 11.5, font: 'display', strong: false, label: true },
  caption: { size: 12.5, font: 'body', strong: false },
  number: { size: 24, font: 'number', strong: true },
};

export type TxtColor = 'text' | 'dim' | 'accent' | 'onAccent' | (string & {});

export function resolveColor(theme: Theme, color: TxtColor): string {
  switch (color) {
    case 'text':
      return theme.colors.text;
    case 'dim':
      return theme.colors.textDim;
    case 'accent':
      return theme.colors.accent;
    case 'onAccent':
      return theme.colors.accentText;
    default:
      return color;
  }
}

/** Text style for a variant in the given era, with every font's size quirks evened out. */
export function textStyle(theme: Theme, variant: TxtVariant, size?: number, compact = false): TextStyle {
  const base = BASE[variant];
  const spec = theme.fonts[base.font] ?? theme.fonts.display;
  const fontSize = Math.round((size ?? base.size) * spec.scale * (compact ? (spec.compact ?? 1) : 1) * 10) / 10;
  return {
    fontFamily: base.strong ? spec.strong : spec.regular,
    fontSize,
    lineHeight: Math.round(fontSize * spec.leading),
    letterSpacing: fontSize * (spec.tracking + (base.label && !spec.upper ? 0.08 : 0)),
    ...(spec.systemWeights ? { fontWeight: base.strong ? spec.systemWeights.strong : spec.systemWeights.regular } : null),
    ...(spec.upper || base.label ? { textTransform: 'uppercase' as const } : null),
  };
}

export interface TxtProps extends TextProps {
  variant?: TxtVariant;
  color?: TxtColor;
  /** Base size before the era's font scale is applied. */
  size?: number;
  center?: boolean;
  /** For text inside buttons, tabs and chips: applies the era's extra shrink for tight spots. */
  compact?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Txt({ variant = 'body', color = 'text', size, center, compact, style, ...rest }: TxtProps) {
  const theme = useTheme();
  return <Text {...rest} style={[textStyle(theme, variant, size, compact), { color: resolveColor(theme, color) }, center && { textAlign: 'center' }, style]} />;
}
