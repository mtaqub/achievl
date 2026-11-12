import { useRouter } from 'expo-router';
import { LoadoutPanel } from '@/components/LoadoutPanel';
import { RunPanel } from '@/components/RunPanel';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Divider, Row } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { PlayerCard } from '@/components/PlayerCard';
import { QuestRow } from '@/components/QuestRow';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { formatDay, formatTime } from '@/game/dates';
import { waterStep } from '@/game/live';
import { formatVolume } from '@/game/nutrition';
import { useToday } from '@/hooks/useToday';
import { useWallet } from '@/hooks/useWallet';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

const DRAIN_WORDS = { thirst: 'thirst', hunger: 'hunger', idle: 'unfinished quests', overfed: 'overeating' } as const;

export default function Dashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const goals = useGame((s) => s.data.goals);
  const units = useGame((s) => s.data.units);
  const logWater = useGame((s) => s.logWater);
  const { today, quests, log, done, nutrients, waterMl, meters, firstDay } = useToday();

  const wallet = useWallet();
  const step = waterStep(units);
  const upNext = quests.filter((q) => !log.completions[q.id]).slice(0, 4);
  const unlocked = Object.values(log.completions)
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
  const drains = (Object.keys(DRAIN_WORDS) as (keyof typeof DRAIN_WORDS)[])
    .filter((key) => meters.drains[key] > 0)
    .map((key) => `${DRAIN_WORDS[key]} −${meters.drains[key]}`);

  return (
    <Screen title="Achievl" subtitle={formatDay(today)}>
      <PlayerCard />

      <Panel title="Vitals" icon="heart-pulse">
        <View style={styles.meters}>
          <Meter label="Health" icon="heart" color={colors.hp} value={meters.hp / 100} readout={`${meters.hp} HP · ${meters.status}`} />
          <Meter
            label="Food/Drink"
            icon="food-apple"
            color={colors.food}
            value={meters.food}
            pace={meters.pace}
            readout={`${Math.round(nutrients.kcal)} / ${goals.kcal} kcal`}
          />
          <Meter
            label="Water"
            icon="water"
            color={colors.water}
            value={meters.water}
            pace={meters.pace}
            readout={`${formatVolume(waterMl, units)} / ${formatVolume(goals.waterMl, units)}`}
          />
          <Txt variant="caption" color="dim">
            {firstDay
              ? 'Day one is a free run: health starts draining tomorrow if you fall behind on water, food or quests.'
              : drains.length > 0
                ? `Losing health to ${drains.join(', ')}. Catch up to the marker to recover.`
                : 'The marker on each bar shows where you should be by this time of day.'}
          </Txt>
        </View>
        <View style={styles.actions}>
          <Btn
            label={step.label}
            icon="water-plus"
            size="sm"
            onPress={() => logWater(step.ml)}
            style={styles.action}
            accessibilityLabel={`Log ${step.label} of water`}
          />
          <Btn
            label="Food/Drink"
            icon="silverware-fork-knife"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/food-add')}
            style={styles.action}
            accessibilityLabel="Log food or drink"
          />
          <Btn
            label="Scan"
            icon="barcode-scan"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/scan')}
            style={styles.action}
            accessibilityLabel="Scan a barcode"
          />
        </View>
      </Panel>

      <Panel title="Today's quests" icon="sword-cross" right={<Txt variant="heading" size={14} color={colors.headerText}>{`${done}/${quests.length}`}</Txt>}>
        {quests.length === 0 ? (
          <View style={styles.empty}>
            <Txt color="dim">Your quest board is empty. Pick a few from the catalog or write your own.</Txt>
            <Btn label="Add quests" icon="plus" onPress={() => router.push('/quest-picker')} />
          </View>
        ) : upNext.length === 0 ? (
          <View style={styles.empty}>
            <Txt variant="heading">All clear!</Txt>
            <Txt color="dim">Every quest on today&apos;s board is done.</Txt>
          </View>
        ) : (
          <View>
            {upNext.map((quest, i) => (
              <View key={quest.id}>
                {i > 0 && <Divider />}
                <QuestRow quest={quest} done={false} />
              </View>
            ))}
            <Btn label="Quest board" variant="ghost" size="sm" icon="chevron-right" onPress={() => router.navigate('/quests')} style={styles.more} />
          </View>
        )}
      </Panel>

      <RunPanel />

      <LoadoutPanel />

      <Panel title="Arcade" icon="gamepad-variant">
        <Row
          icon="package-variant-closed"
          iconColor={colors.gold}
          title="Crates and loot boxes"
          subtitle={`${wallet.keys} ${wallet.keys === 1 ? 'key' : 'keys'} · ${wallet.boxes} ${wallet.boxes === 1 ? 'box' : 'boxes'} · ${wallet.shards} shards`}
          onPress={() => router.push('/arcade')}
          right={<Icon name="chevron-right" size={24} color={colors.textDim} />}
          accessibilityLabel="Open the arcade"
        />
      </Panel>

      <Panel title="Forum" icon="forum">
        <Row
          icon="message-text"
          title="Talk to other players"
          subtitle="Threads on quests, food and streaks."
          onPress={() => router.push('/forum')}
          right={<Icon name="chevron-right" size={24} color={colors.textDim} />}
          accessibilityLabel="Open the forum"
        />
      </Panel>

      <Panel title="Unlocked today" icon="trophy">
        {unlocked.length === 0 ? (
          <Txt color="dim">Nothing yet. Clear a quest and it shows up here as an achievement.</Txt>
        ) : (
          unlocked.map((c, i) => (
            <View key={c.questId}>
              {i > 0 && <Divider />}
              <Row
                icon={c.icon}
                iconColor={colors.gold}
                title={c.title}
                subtitle={formatTime(c.at)}
                right={<Txt variant="heading" size={14} color={colors.gold}>{`+${c.points}`}</Txt>}
              />
            </View>
          ))
        )}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meters: { gap: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  // Grow from their own width so a longer label gets the room it needs.
  action: { flexGrow: 1 },
  empty: { gap: 12 },
  more: { alignSelf: 'flex-end', marginTop: 4 },
});
