import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Theme } from '@/theme/types';

import { Icon } from './Icon';
import { Txt } from './Txt';

const HARD_SHADOW = 4;

/** The glassy highlight across the top of HD-era surfaces. */
export function Gloss({ radius, strength = 0.55 }: { radius: number; strength?: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`rgba(255,255,255,${strength})`, 'rgba(255,255,255,0)']}
      style={[styles.gloss, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
    />
  );
}

function PanelHeader({ theme, title, icon, right }: { theme: Theme; title: string; icon?: string; right?: React.ReactNode }) {
  const { colors, shape } = theme;
  const content = (
    <View style={styles.headerRow}>
      {shape.header === 'tag' && <View style={[styles.tagBar, { backgroundColor: colors.accent }]} />}
      {icon && <Icon name={icon} size={16} color={colors.headerText} />}
      <Txt variant="heading" size={14} color={colors.headerText} numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Txt>
      {right}
    </View>
  );

  if (shape.header === 'strip') {
    return (
      <LinearGradient colors={colors.header} style={styles.strip}>
        {shape.gloss && <Gloss radius={0} strength={0.35} />}
        {content}
      </LinearGradient>
    );
  }
  return (
    <View
      style={[
        styles.plainHeader,
        shape.header === 'rule' && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.panelBorder, paddingBottom: 8 },
      ]}>
      {content}
    </View>
  );
}

export interface PanelProps {
  title?: string;
  icon?: string;
  /** Extra content at the right of the title row. */
  right?: React.ReactNode;
  children?: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The basic surface of every screen, drawn the way the current era draws its boxes. */
export function Panel({ title, icon, right, children, padded = true, style }: PanelProps) {
  const theme = useTheme();
  const { colors, shape } = theme;

  const body = (
    <LinearGradient
      colors={colors.panel}
      style={[
        styles.panel,
        { borderRadius: shape.panelRadius, borderWidth: shape.border, borderColor: colors.panelBorder },
        shape.softShadow && styles.softShadow,
      ]}>
      {shape.gloss && !title && <Gloss radius={shape.panelRadius - 1} strength={0.5} />}
      {title && <PanelHeader theme={theme} title={title} icon={icon} right={right} />}
      <View style={padded && styles.padded}>{children}</View>
    </LinearGradient>
  );

  if (!shape.hardShadow) return <View style={style}>{body}</View>;
  return (
    <View style={[{ marginRight: HARD_SHADOW, marginBottom: HARD_SHADOW }, style]}>
      <View style={[styles.hardShadow, { backgroundColor: colors.textDim }]} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: 'hidden' },
  padded: { padding: 14 },
  gloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%' },
  strip: { paddingHorizontal: 14, paddingVertical: 9 },
  plainHeader: { paddingHorizontal: 14, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { flex: 1 },
  tagBar: { width: 3, height: 14 },
  softShadow: { boxShadow: '0px 3px 8px rgba(20,30,40,0.18)' },
  hardShadow: { position: 'absolute', left: HARD_SHADOW, top: HARD_SHADOW, right: -HARD_SHADOW, bottom: -HARD_SHADOW },
});
