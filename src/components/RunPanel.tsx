import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { getEffectivePlayerStats } from '@/core/controller';
import { cumulativeXp, levelProgress, xpToNext } from '@/core/dailySession';
import { BUFF_BY_ID, SYNERGY_REGISTRY, XP_CURVE } from '@/core/registry';
import { DAY_MS } from '@/core/types';
import { useNow } from '@/hooks/useNow';
import { useCore } from '@/store/useCore';
import { useTheme } from '@/theme/ThemeProvider';

import { Btn } from './Btn';
import { Chip } from './controls';
import { Bar } from './Meter';
import { Panel } from './Panel';
import { Txt } from './Txt';
import { CORE_RARITY_COLOR } from './UIEventHost';

const two = (n: number) => String(n).padStart(2, '0');

/** hh:mm:ss until `end`. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
}

/** Today's run on the home page: level, XP to next, buffs, synergies, multipliers and the reset clock. */
export function RunPanel() {
  const { colors } = useTheme();
  const router = useRouter();
  const now = useNow(1000);
  const state = useCore((s) => s.state);
  const ready = useCore((s) => s.ready);
  if (!ready) return null;

  const { session, meta } = state;
  const stats = getEffectivePlayerStats(state, now);
  const maxed = session.level >= XP_CURVE.maxLevel;
  const into = Math.round(session.xp - cumulativeXp(session.level));
  const need = xpToNext(session.level);
  const synergies = session.evolutions.map((e) => SYNERGY_REGISTRY.find((r) => r.id === e.recipeId)?.name).filter(Boolean) as string[];

  return (
    <Panel
      title="Today's run"
      icon="timer-sand"
      right={
        <Txt variant="number" size={14} color={colors.headerText}>
          {countdown(session.dayStart + DAY_MS - now)}
        </Txt>
      }>
      <View style={styles.block}>
        <View style={styles.row}>
          <Txt variant="title" size={20}>{`lv ${session.level}`}</Txt>
          <Txt variant="caption" color="dim">
            {maxed ? 'max level' : `${into} / ${need} xp`}
          </Txt>
        </View>
        <Bar value={maxed ? 1 : levelProgress(session.xp)} color={colors.xp} />
        {session.pendingDrafts > 0 && <Txt variant="caption" color={colors.gold}>{`${session.pendingDrafts} buff pick waiting`}</Txt>}
        <View style={styles.chips}>
          {session.buffs.map((b) => {
            const buff = BUFF_BY_ID.get(b.buffId);
            return buff ? <Chip key={b.buffId} label={`${buff.name}${b.stacks > 1 ? ` x${b.stacks}` : ''}`} color={CORE_RARITY_COLOR[buff.rarity]} /> : null;
          })}
          {synergies.map((name) => (
            <Chip key={name} label={name} icon="atom-variant" color={CORE_RARITY_COLOR.LEGENDARY} filled />
          ))}
          {session.buffs.length === 0 && synergies.length === 0 && (
            <Txt variant="caption" color="dim">
              level up to draft buffs. quests, food/drink and water all count.
            </Txt>
          )}
        </View>
        <Txt variant="caption" color="dim">
          {`xp x${stats.effectiveXpMult.toFixed(2)} · gold x${stats.effectiveGoldMult.toFixed(2)} · luck x${stats.effectiveLuck.toFixed(2)}${stats.penaltyPct > 0 ? ` · missed-day penalty -${Math.round(stats.penaltyPct * 100)}%` : ''}`}
        </Txt>
        <View style={styles.row}>
          <Txt
            variant="caption"
            color="dim">{`${meta.gold} gold · ${meta.pixelDust} dust · streak ${meta.streak.current}${meta.streak.shields.length ? ` · ${meta.streak.shields.length} shield` : ''}`}</Txt>
          <Btn label="Vault" icon="treasure-chest" size="sm" variant="secondary" onPress={() => router.push('/vault')} />
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
