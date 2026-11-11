import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { Icon } from './Icon';
import { Gloss } from './Panel';
import { Txt } from './Txt';

export const TABS: Record<string, { label: string; icon: string }> = {
  index: { label: 'Home', icon: 'view-dashboard' },
  quests: { label: 'Quests', icon: 'sword-cross' },
  fuel: { label: 'Fuel', icon: 'food-apple' },
  trophies: { label: 'Trophies', icon: 'trophy' },
  profile: { label: 'Player', icon: 'account-circle' },
};

/** Bottom navigation, redrawn per era: glossy blades, glowing icons, a pixel cursor or a pill. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, shape } = useTheme();
  const insets = useSafeAreaInsets();
  const style = shape.tab;

  return (
    <LinearGradient
      colors={colors.tabBar}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), borderTopColor: colors.tabBorder, borderTopWidth: Math.max(1, shape.border - 1) }]}>
      <View style={styles.inner} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          const tint = focused ? (style === 'blade' || style === 'pill' ? colors.accentText : colors.accent) : colors.tabIdle;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={onPress}
              style={styles.tab}>
              <View
                style={[
                  styles.tabInner,
                  style === 'blade' && { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
                  style === 'pill' && { borderRadius: 16 },
                ]}>
                {focused && (style === 'blade' || style === 'pill') && (
                  <LinearGradient
                    colors={colors.accentGradient}
                    style={[
                      StyleSheet.absoluteFill,
                      style === 'blade'
                        ? { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                        : { borderRadius: 16 },
                    ]}>
                    {shape.gloss && <Gloss radius={14} strength={0.45} />}
                  </LinearGradient>
                )}
                <View style={styles.iconRow}>
                  {style === 'cursor' && <Icon name="menu-right" size={16} color={focused ? colors.accent : 'transparent'} style={styles.cursor} />}
                  <Icon name={meta.icon} size={22} color={tint} />
                </View>
                <Txt variant="label" size={9.5} color={tint} numberOfLines={1} compact>
                  {meta.label}
                </Txt>
                {focused && style === 'glow' && (
                  <View style={[styles.glowLine, { backgroundColor: colors.accent, boxShadow: `0px 0px 8px ${colors.accent}` }]} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: 6, paddingHorizontal: 6 },
  inner: { flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center' },
  tab: { flex: 1, paddingHorizontal: 2 },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 50, paddingVertical: 6, overflow: 'hidden' },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  cursor: { marginLeft: -16 },
  glowLine: { position: 'absolute', bottom: 0, width: 26, height: 2, borderRadius: 1 },
});
