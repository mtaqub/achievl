import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';

import { TabBar } from '@/components/TabBar';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();
  const onboarded = useGame((s) => s.data.onboarded);

  if (!onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="quests" />
      <Tabs.Screen name="fuel" />
      <Tabs.Screen name="trophies" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
