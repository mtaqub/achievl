import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/game/engine';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';
import { Theme } from '@/theme/types';

import { Icon } from './Icon';
import { Gloss } from './Panel';
import { Txt } from './Txt';

const SHOW_MS = 2800;

function headlineFor(theme: Theme, toast: Toast): string {
  if (toast.kind === 'quest') return theme.toast.quest;
  if (toast.kind === 'milestone') return theme.toast.milestone;
  return toast.kind === 'rank' ? 'Rank up' : theme.toast.level;
}

function ToastBody({ toast }: { toast: Toast }) {
  const theme = useTheme();
  const { colors, shape } = theme;
  const kind = theme.toast.shape;
  const headline = headlineFor(theme, toast);
  const points = toast.points ? `${toast.points} AP` : null;
  const round = kind === 'pill';
  const radius = round ? 34 : kind === 'card' ? shape.radius : 0;
  const badge = round ? 46 : 40;

  return (
    <LinearGradient
      colors={colors.toast}
      style={[styles.body, { borderRadius: radius, borderColor: colors.toastBorder, borderWidth: kind === 'box' ? 3 : 1 }, kind !== 'box' && styles.shadow]}>
      {shape.gloss && <Gloss radius={radius} strength={0.18} />}
      <View
        style={[
          styles.badge,
          {
            width: badge,
            height: badge,
            borderRadius: round ? badge / 2 : Math.min(shape.radius, 8),
            borderColor: colors.accent,
            backgroundColor: colors.inset,
          },
        ]}>
        <Icon name={toast.icon} size={badge * 0.55} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Txt variant="label" size={10.5} color={colors.toastDim} numberOfLines={1}>
          {headline}
        </Txt>
        <Txt variant="heading" size={15} color={colors.toastText} numberOfLines={1}>
          {points ? `${points} · ${toast.title}` : toast.title}
        </Txt>
        {kind !== 'pill' && (
          <Txt variant="caption" color={colors.toastDim} numberOfLines={1}>
            {toast.subtitle}
          </Txt>
        )}
      </View>
    </LinearGradient>
  );
}

/** Shows queued unlock pop-ups one at a time, in the current era's style. */
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useGame((s) => s.toasts[0]);
  const dismiss = useGame((s) => s.dismissToast);
  const anim = useAnimatedValue(0);
  const id = toast?.id;

  useEffect(() => {
    if (!id) return;
    anim.setValue(0);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    const run = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 340, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.delay(SHOW_MS),
      Animated.timing(anim, { toValue: 0, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    run.start(({ finished }) => {
      if (finished) dismiss(id);
    });
    return () => run.stop();
  }, [anim, dismiss, id]);

  if (!toast) return null;

  const fromTop = theme.toast.place === 'top';
  const travel = anim.interpolate({ inputRange: [0, 1], outputRange: [fromTop ? -40 : 50, 0] });
  // The pill grows outward from its badge; the others just slide.
  const scaleX = theme.toast.shape === 'pill' ? anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 1;

  return (
    <View pointerEvents="box-none" style={[styles.host, fromTop ? { top: insets.top + 10 } : { bottom: insets.bottom + 92 }]}>
      <Animated.View style={{ opacity: anim, transform: [{ translateY: travel }, { scaleX }] }}>
        <Pressable accessibilityRole="alert" accessibilityLabel={`${headlineFor(theme, toast)}: ${toast.title}`} onPress={() => dismiss(toast.id)}>
          <ToastBody toast={toast} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 22,
    maxWidth: 420,
    minWidth: 240,
    overflow: 'hidden',
  },
  shadow: { boxShadow: '0px 6px 16px rgba(0,0,0,0.35)' },
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  text: { flexShrink: 1, gap: 1 },
});
