import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Icon } from './Icon';
import { Gloss } from './Panel';
import { Txt } from './Txt';

export interface BtnProps {
  label: string;
  onPress?: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  disabled?: boolean;
  /** Stretch to the width of the container. */
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Btn({ label, onPress, icon, variant = 'primary', size = 'md', disabled, full, style, accessibilityLabel }: BtnProps) {
  const { colors, shape } = useTheme();
  const small = size === 'sm';

  const fg = variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.accent : colors.text;
  const borderColor = variant === 'primary' ? colors.panelBorder : variant === 'danger' ? colors.danger : colors.insetBorder;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={small ? 8 : 4}
      style={({ pressed }) => [full && styles.full, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1, transform: [{ translateY: pressed ? 1 : 0 }] }, style]}>
      <View
        style={[
          styles.base,
          small ? styles.small : styles.medium,
          { borderRadius: shape.radius },
          variant !== 'ghost' && { borderWidth: Math.max(1, shape.border - 1), borderColor },
          variant === 'secondary' && { backgroundColor: colors.inset },
        ]}>
        {variant === 'primary' && <LinearGradient colors={colors.accentGradient} style={[StyleSheet.absoluteFill, { borderRadius: shape.radius - 1 }]} />}
        {variant === 'primary' && shape.gloss && <Gloss radius={shape.radius - 1} strength={0.4} />}
        {icon && <Icon name={icon} size={small ? 15 : 18} color={fg} />}
        <Txt
          variant="heading"
          size={small ? 12.5 : 14.5}
          color={fg}
          numberOfLines={1}
          compact
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={styles.label}>
          {label}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, overflow: 'hidden' },
  medium: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 10 },
  small: { minHeight: 34, paddingHorizontal: 10, paddingVertical: 6 },
  label: { flexShrink: 1 },
});
