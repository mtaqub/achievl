import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Icon } from './Icon';
import { textStyle, Txt } from './Txt';

/** Square icon badge used at the start of list rows. */
export function IconTile({ icon, color, size = 40, dim }: { icon: string; color?: string; size?: number; dim?: boolean }) {
  const { colors, shape } = useTheme();
  const tint = color ?? colors.accent;
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.min(shape.radius, size / 2),
          backgroundColor: colors.inset,
          borderColor: dim ? colors.insetBorder : tint,
          borderWidth: Math.max(1, shape.border - 1),
          opacity: dim ? 0.55 : 1,
        },
      ]}>
      <Icon name={icon} size={size * 0.55} color={dim ? colors.textDim : tint} />
    </View>
  );
}

export function Chip({ label, icon, color, filled }: { label: string; icon?: string; color?: string; filled?: boolean }) {
  const { colors, shape } = useTheme();
  const tint = color ?? colors.textDim;
  return (
    <View style={[styles.chip, { borderRadius: Math.min(shape.radius, 10), borderColor: tint, backgroundColor: filled ? tint : 'transparent' }]}>
      {icon && <Icon name={icon} size={12} color={filled ? colors.accentText : tint} />}
      <Txt variant="label" size={10.5} color={filled ? colors.accentText : tint} compact>
        {label}
      </Txt>
    </View>
  );
}

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Let options wrap onto more rows instead of sharing one. */
  wrap?: boolean;
}

export function Segmented<T extends string>({ options, value, onChange, wrap }: SegmentedProps<T>) {
  const { colors, shape } = useTheme();
  return (
    <View style={[styles.segmented, wrap && styles.segmentedWrap]} accessibilityRole="radiogroup">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.segmentBtn,
              !wrap && styles.segmentFlex,
              {
                borderRadius: shape.radius,
                borderColor: on ? colors.accent : colors.insetBorder,
                backgroundColor: on ? colors.accent : colors.inset,
                borderWidth: Math.max(1, shape.border - 1),
              },
            ]}>
            {option.icon && <Icon name={option.icon} size={14} color={on ? colors.accentText : colors.textDim} />}
            <Txt variant="heading" size={12} color={on ? colors.accentText : colors.textDim} numberOfLines={1} compact>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface FieldProps extends TextInputProps {
  label: string;
  /** Short unit shown inside the field, e.g. "g". */
  suffix?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, suffix, hint, containerStyle, style, ...input }: FieldProps) {
  const theme = useTheme();
  const { colors, shape } = theme;
  return (
    <View style={[styles.field, containerStyle]}>
      <Txt variant="label" color="dim">
        {label}
      </Txt>
      <View
        style={[
          styles.inputWrap,
          { borderRadius: shape.radius, borderColor: colors.insetBorder, backgroundColor: colors.inset, borderWidth: Math.max(1, shape.border - 1) },
        ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textDim}
          selectionColor={colors.accent}
          {...input}
          style={[textStyle(theme, 'body'), styles.input, { color: colors.text }, style]}
        />
        {suffix && (
          <Txt variant="caption" color="dim">
            {suffix}
          </Txt>
        )}
      </View>
      {hint && (
        <Txt variant="caption" color="dim">
          {hint}
        </Txt>
      )}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99,
  format,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  label: string;
}) {
  const { colors, shape } = useTheme();
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next * 100) / 100)));
  const button = (icon: string, delta: number, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      onPress={() => set(value + delta)}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepBtn,
        { borderRadius: shape.radius, borderColor: colors.insetBorder, backgroundColor: colors.inset, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon name={icon} size={20} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {button('minus', -step, 'Decrease')}
      <Txt variant="number" size={20} center style={styles.stepValue}>
        {format ? format(value) : String(value)}
      </Txt>
      {button('plus', step, 'Increase')}
    </View>
  );
}

/** A pressable list row: icon tile, title + subtitle, optional trailing content. */
export function Row({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  dim,
  accessibilityLabel,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  dim?: boolean;
  accessibilityLabel?: string;
}) {
  const content = (
    <>
      <IconTile icon={icon} color={iconColor} dim={dim} />
      <View style={styles.rowText}>
        <Txt variant="bodyStrong" color={dim ? 'dim' : 'text'} numberOfLines={2}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color="dim" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.insetBorder }]} />;
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  segmented: { flexDirection: 'row', gap: 6 },
  segmentedWrap: { flexWrap: 'wrap' },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 38, paddingHorizontal: 10, paddingVertical: 7 },
  segmentFlex: { flex: 1 },
  field: { gap: 5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 },
  input: { flex: 1, minHeight: 44, paddingVertical: 8, minWidth: 0 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepValue: { minWidth: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowText: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth * 2, opacity: 0.7 },
});
