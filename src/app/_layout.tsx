import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';

import { DialogHost } from '@/components/Dialog';
import { ToastHost } from '@/components/ToastHost';
import { useHydrated } from '@/hooks/useHydrated';
import { useLiveSync } from '@/live/useLiveSync';
import { syncAppIcon } from '@/services/appIcon';
import { useGame } from '@/store/useGame';
import { FONT_ASSETS } from '@/theme/fontAssets';
import { DEFAULT_THEME } from '@/theme/themes';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// Hold the splash screen until fonts and the saved game are both in memory.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell({ ready }: { ready: boolean }) {
  const theme = useTheme();
  const onboarded = useGame((s) => s.data.onboarded);
  const matchIcon = useGame((s) => s.data.matchIcon);

  useLiveSync(ready);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {});
  }, [theme]);

  // The home-screen icon follows the era, unless the player turned that off.
  useEffect(() => {
    if (ready && onboarded) void syncAppIcon(matchIcon ? theme : DEFAULT_THEME);
  }, [ready, onboarded, matchIcon, theme]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'slide_from_right',
        }}
      />
      <ToastHost />
      <DialogHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const hydrated = useHydrated();
  // A font that fails to load should not keep the app on the splash screen.
  const ready = hydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <ThemeProvider>
      <Shell ready={ready} />
    </ThemeProvider>
  );
}
