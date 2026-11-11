import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Divider } from '@/components/controls';
import { Bar } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { QuestRow } from '@/components/QuestRow';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { formatDay } from '@/game/dates';
import { dayPoints } from '@/game/engine';
import { QuestSlot } from '@/game/types';
import { useToday } from '@/hooks/useToday';
import { useTheme } from '@/theme/ThemeProvider';

const SLOTS: { slot: QuestSlot; title: string; icon: string }[] = [
  { slot: 'morning', title: 'Morning', icon: 'weather-sunset-up' },
  { slot: 'afternoon', title: 'Afternoon', icon: 'weather-sunny' },
  { slot: 'evening', title: 'Evening', icon: 'weather-night' },
  { slot: 'anytime', title: 'Anytime', icon: 'infinity' },
];

export default function Quests() {
  const { colors } = useTheme();
  const router = useRouter();
  const { today, quests, log, done, streak } = useToday();
  const total = quests.length;

  return (
    <Screen
      title="Quests"
      subtitle={formatDay(today)}
      right={<Btn label="Add" icon="plus" size="sm" onPress={() => router.push('/quest-picker')} accessibilityLabel="Add quests" />}>
      <Panel>
        <View style={styles.progress}>
          <View style={styles.progressHead}>
            <Txt variant="number">{`${done} / ${total}`}</Txt>
            <Txt variant="caption" color="dim">
              {`${dayPoints(log)} AP today · ${streak} day streak`}
            </Txt>
          </View>
          <Bar value={total > 0 ? done / total : 0} color={colors.xp} />
          <Txt variant="caption" color="dim">
            {total === 0
              ? 'Add quests to start earning achievements.'
              : done === total
                ? 'Board cleared. Come back tomorrow for a fresh one.'
                : 'Tap a quest when you have done it. Daily quests reset at midnight.'}
          </Txt>
        </View>
      </Panel>

      {SLOTS.map(({ slot, title, icon }) => {
        const list = quests.filter((q) => q.slot === slot);
        if (list.length === 0) return null;
        return (
          <Panel key={slot} title={title} icon={icon}>
            {list.map((quest, i) => (
              <View key={quest.id}>
                {i > 0 && <Divider />}
                <QuestRow quest={quest} done={!!log.completions[quest.id]} onEdit={() => router.push({ pathname: '/quest-edit', params: { id: quest.id } })} />
              </View>
            ))}
          </Panel>
        );
      })}

      {total === 0 && (
        <Panel title="No quests yet" icon="sword-cross">
          <View style={styles.empty}>
            <Txt color="dim">Pick from the catalog — make the bed, drink water, go for a walk — or write your own.</Txt>
            <Btn label="Browse the catalog" icon="plus" onPress={() => router.push('/quest-picker')} />
          </View>
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 8 },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  empty: { gap: 12 },
});
