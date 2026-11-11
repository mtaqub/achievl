import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tierColor } from '@/components/badges';
import { Divider, IconTile, Row, Segmented } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Bar } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { addDays, dayKey, formatDay, formatTime } from '@/game/dates';
import { buildMilestoneContext, daySummary } from '@/game/engine';
import { MILESTONES, milestoneProgress, TIER_ORDER } from '@/game/milestones';
import { formatVolume } from '@/game/nutrition';
import { useToday } from '@/hooks/useToday';
import { shareText } from '@/services/share';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'today' | 'milestones' | 'history';
const HISTORY_DAYS = 14;

export default function Trophies() {
  const theme = useTheme();
  const { colors } = theme;
  const data = useGame((s) => s.data);
  const recordShare = useGame((s) => s.recordShare);
  const { today, quests, log } = useToday();
  const [tab, setTab] = useState<Tab>('today');

  const ctx = useMemo(() => buildMilestoneContext(data), [data]);
  const unlockedCount = MILESTONES.filter((m) => data.unlocked[m.id]).length;
  const milestones = useMemo(
    () =>
      [...MILESTONES].sort((a, b) => {
        const ua = data.unlocked[a.id] ? 0 : 1;
        const ub = data.unlocked[b.id] ? 0 : 1;
        return ua - ub || milestoneProgress(b, ctx) - milestoneProgress(a, ctx) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
      }),
    [ctx, data.unlocked]
  );
  const history = useMemo(
    () =>
      Array.from({ length: HISTORY_DAYS }, (_, i) => daySummary(data, addDays(today, -i))).filter(
        (d, i) => i === 0 || d.cleared > 0 || d.kcal > 0 || d.waterMl > 0
      ),
    [data, today]
  );

  const share = async (title: string, points: number) => {
    const outcome = await shareText(`${theme.toast.quest}: ${title} — ${points} AP. ${data.profile.name} is level ${ctx.level} on Achievl.`);
    if (outcome === 'shared' || outcome === 'copied') recordShare();
  };

  // Cleared quests first (newest on top), then what is still locked.
  const cleared = quests.filter((q) => log.completions[q.id]).sort((a, b) => log.completions[b.id].at - log.completions[a.id].at);
  const locked = quests.filter((q) => !log.completions[q.id]);

  return (
    <Screen title="Trophies" subtitle={`${data.xp.toLocaleString('en-US')} AP lifetime`}>
      <Panel>
        <View style={styles.summary}>
          <View style={styles.summaryHead}>
            <Icon name="trophy" size={26} color={colors.gold} />
            <View style={styles.summaryText}>
              <Txt variant="heading">{`${unlockedCount} of ${MILESTONES.length} milestones`}</Txt>
              <Txt variant="caption" color="dim">{`${ctx.questsCleared} quests cleared · best streak ${ctx.bestStreak}`}</Txt>
            </View>
          </View>
          <Bar value={unlockedCount / MILESTONES.length} color={colors.gold} height={12} />
        </View>
      </Panel>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'milestones', label: 'Milestones' },
          { value: 'history', label: 'History' },
        ]}
      />

      {tab === 'today' && (
        <Panel title="Today's achievements" icon="star-four-points">
          {quests.length === 0 && <Txt color="dim">Add quests and each one becomes an achievement you can unlock today.</Txt>}
          {cleared.map((quest, i) => {
            const c = log.completions[quest.id];
            return (
              <View key={quest.id}>
                {i > 0 && <Divider />}
                <Row
                  icon={quest.icon}
                  iconColor={colors.gold}
                  title={c.title}
                  subtitle={`Unlocked ${formatTime(c.at)} · ${c.points} AP`}
                  right={
                    <Pressable accessibilityRole="button" accessibilityLabel={`Share ${c.title}`} hitSlop={10} onPress={() => share(c.title, c.points)}>
                      <Icon name="share-variant" size={22} color={colors.accent} />
                    </Pressable>
                  }
                />
              </View>
            );
          })}
          {locked.map((quest, i) => (
            <View key={quest.id}>
              {(i > 0 || cleared.length > 0) && <Divider />}
              <Row icon="lock" title={quest.title} subtitle={`Locked · ${quest.points} AP`} dim />
            </View>
          ))}
        </Panel>
      )}

      {tab === 'milestones' && (
        <Panel title="Milestones" icon="medal">
          {milestones.map((m, i) => {
            const at = data.unlocked[m.id];
            const value = Math.min(m.target, Math.floor(m.value(ctx)));
            const color = tierColor(theme, m.tier);
            return (
              <View key={m.id}>
                {i > 0 && <Divider />}
                <View style={styles.milestone}>
                  <IconTile icon={at ? m.icon : 'lock'} color={color} dim={!at} />
                  <View style={styles.milestoneText}>
                    <View style={styles.milestoneHead}>
                      <Txt variant="bodyStrong" color={at ? 'text' : 'dim'} style={styles.flex} numberOfLines={1}>
                        {m.title}
                      </Txt>
                      <Txt variant="label" size={10.5} color={color}>{`${m.tier} · ${m.points}`}</Txt>
                    </View>
                    <Txt variant="caption" color="dim">
                      {m.description}
                    </Txt>
                    {at ? (
                      <Txt variant="caption" color="accent">{`Unlocked ${formatDay(dayKey(new Date(at)))}`}</Txt>
                    ) : (
                      <View style={styles.milestoneBar}>
                        <View style={styles.flex}>
                          <Bar value={milestoneProgress(m, ctx)} color={color} height={8} />
                        </View>
                        <Txt variant="caption" color="dim">{`${value}/${m.target}`}</Txt>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </Panel>
      )}

      {tab === 'history' && (
        <Panel title={`Last ${HISTORY_DAYS} days`} icon="history">
          {history.map((d, i) => (
            <View key={d.day}>
              {i > 0 && <Divider />}
              <Row
                icon={d.perfect ? 'check-all' : d.cleared > 0 ? 'calendar-check' : 'calendar'}
                iconColor={d.perfect ? colors.gold : colors.accent}
                dim={d.cleared === 0}
                title={d.day === today ? 'Today' : formatDay(d.day)}
                subtitle={`${d.cleared}/${d.planned} quests · ${d.kcal} kcal · ${formatVolume(d.waterMl, data.units)}`}
                right={<Txt variant="heading" size={14} color={colors.gold}>{`${d.points} AP`}</Txt>}
              />
            </View>
          ))}
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: 12 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1, gap: 2 },
  milestone: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  milestoneText: { flex: 1, gap: 3 },
  milestoneHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  milestoneBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
});
