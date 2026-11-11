import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Field } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { QUEST_CATALOG, STARTER_TEMPLATE_IDS } from '@/data/questCatalog';
import { DEFAULT_THEME_ID } from '@/game/engine';
import { useGame } from '@/store/useGame';
import { themeById, THEMES } from '@/theme/themes';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

/** Quests offered on the first-run screen: the starters plus a few popular extras. */
const OFFERED = [...STARTER_TEMPLATE_IDS, 'pushups', 'meditate', 'journal', 'dishes', 'vitamins', 'message'];

function Setup({ themeId, onTheme }: { themeId: string; onTheme: (id: string) => void }) {
  const { colors, shape } = useTheme();
  const completeOnboarding = useGame((s) => s.completeOnboarding);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>(STARTER_TEMPLATE_IDS);
  const theme = themeById(themeId);

  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  // Finishing setup flips `onboarded`, and the redirect below takes the player to the dashboard.
  const start = () => completeOnboarding({ name, themeId, templates: QUEST_CATALOG.filter((q) => picked.includes(q.id)) });

  return (
    <Screen title="Achievl" subtitle="Turn your day into achievements" footer={<Btn label="Press start" icon="play" onPress={start} />}>
      <Panel title="Player" icon="account-circle">
        <Field label="Your name" value={name} onChangeText={setName} placeholder="Player One" maxLength={16} autoCapitalize="words" returnKeyType="done" />
      </Panel>

      <Panel title="Era" icon="history">
        <View style={styles.block}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eras}>
            {THEMES.map((t) => {
              const on = t.id === themeId;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${t.name}, ${t.year}`}
                  onPress={() => onTheme(t.id)}
                  style={[styles.era, { borderColor: on ? colors.accent : 'transparent', borderRadius: 16 }]}>
                  <Image source={t.iconImage} style={styles.eraIcon} accessibilityIgnoresInvertColors />
                </Pressable>
              );
            })}
          </ScrollView>
          <View>
            <Txt variant="heading">{`${theme.name} · ${theme.year}`}</Txt>
            <Txt variant="caption" color="dim">
              {`${theme.blurb} You can switch eras any time, and the app icon follows.`}
            </Txt>
          </View>
        </View>
      </Panel>

      <Panel title="Starter quests" icon="sword-cross">
        <View style={styles.block}>
          <Txt variant="caption" color="dim">
            Each quest you clear unlocks as an achievement. Choose a few to begin — you can add, edit or write your own later.
          </Txt>
          <View style={styles.quests}>
            {OFFERED.map((id) => {
              const quest = QUEST_CATALOG.find((q) => q.id === id);
              if (!quest) return null;
              const on = picked.includes(id);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={quest.title}
                  onPress={() => toggle(id)}
                  style={[
                    styles.quest,
                    {
                      borderRadius: shape.radius,
                      borderColor: on ? colors.accent : colors.insetBorder,
                      backgroundColor: on ? colors.accent : colors.inset,
                    },
                  ]}>
                  <Icon name={quest.icon} size={16} color={on ? colors.accentText : colors.textDim} />
                  <Txt variant="heading" size={12.5} color={on ? colors.accentText : colors.textDim}>
                    {quest.title}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Panel>
    </Screen>
  );
}

export default function Welcome() {
  const onboarded = useGame((s) => s.data.onboarded);
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  if (onboarded) return <Redirect href="/" />;

  // Preview the chosen era straight away; it is only saved when the player presses start.
  return (
    <ThemeProvider override={themeById(themeId)}>
      <Setup themeId={themeId} onTheme={setThemeId} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  eras: { gap: 8, paddingVertical: 2 },
  era: { borderWidth: 3, padding: 2 },
  eraIcon: { width: 60, height: 60, borderRadius: 12 },
  quests: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, minHeight: 38 },
});
