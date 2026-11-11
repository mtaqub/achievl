import { useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { EraBackdrop } from './EraBackdrop';
import { Icon } from './Icon';
import { Txt } from './Txt';

export interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Content at the right of the title, e.g. an add button. */
  right?: React.ReactNode;
  /** Show a back arrow; for screens pushed on top of the tabs. */
  back?: boolean;
  /** Pinned below the scrolling content. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Page frame shared by every screen: era backdrop, safe areas, title and a scrolling column. */
export function Screen({ title, subtitle, right, back, footer, children }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <EraBackdrop />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 28 + (back && !footer ? insets.bottom : 0) }]}>
          <View style={styles.header}>
            {back && (
              <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} hitSlop={12} style={styles.back}>
                <Icon name="chevron-left" size={30} color={colors.text} />
              </Pressable>
            )}
            <View style={styles.titles}>
              <Txt variant="display" size={back ? 22 : 28} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
                {title}
              </Txt>
              {subtitle ? (
                <Txt variant="caption" color="dim" numberOfLines={1}>
                  {subtitle}
                </Txt>
              ) : null}
            </View>
            {right}
          </View>
          {children}
        </ScrollView>
        {footer && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.insetBorder, backgroundColor: colors.bg }]}>
            <View style={styles.footerInner}>{footer}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Capped and centred so tablets and the web preview keep a phone-width column.
  content: { paddingHorizontal: 16, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  back: { marginLeft: -8 },
  titles: { flex: 1, gap: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 12, paddingHorizontal: 16 },
  footerInner: { width: '100%', maxWidth: 528, alignSelf: 'center', gap: 8 },
});
