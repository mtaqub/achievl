import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { RARITY_COLOR } from '@/arcade/types';
import { tick } from '@/arcade/ui/feedback';
import { applyPityMath, chestTierWeights } from '@/core/gacha';
import { BANNER_BY_ID, BUFF_BY_ID, DRAFT_WEIGHTS, PITY } from '@/core/registry';
import { UIEvent } from '@/core/types';
import { coreController, useCore } from '@/store/useCore';
import { useTheme } from '@/theme/ThemeProvider';

import { Btn } from './Btn';
import { Panel } from './Panel';
import { Txt } from './Txt';

/** Core rarities mapped onto the app's fixed rarity colours. */
export const CORE_RARITY_COLOR: Record<string, string> = {
  COMMON: RARITY_COLOR.common,
  RARE: RARITY_COLOR.rare,
  EPIC: RARITY_COLOR.epic,
  LEGENDARY: RARITY_COLOR.legendary,
};

const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
const IN_APP_NOTE = 'items exist only inside achievl and cannot be traded or cashed out.';
/** A short pause between spectacles so one tap never dismisses two. */
const LOCK_MS = 350;

function DraftBody({ event, done }: { event: UIEvent; done: () => void }) {
  const draft = useCore((s) => s.state.session.draft);
  const buffs = useCore((s) => s.state.session.buffs);
  const choices = draft ?? [];
  return (
    <View style={styles.body}>
      <Txt color="dim">{`level ${String(event.payload.level ?? '')} reached. pick one buff for the rest of today.`}</Txt>
      {choices.map((id) => {
        const buff = BUFF_BY_ID.get(id);
        if (!buff) return null;
        const stacks = buffs.find((b) => b.buffId === id)?.stacks ?? 0;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            style={[styles.choice, { borderColor: CORE_RARITY_COLOR[buff.rarity] }]}
            onPress={() => {
              tick();
              coreController.chooseDraft(id);
              done();
            }}>
            <Txt variant="bodyStrong" color={CORE_RARITY_COLOR[buff.rarity]}>{`${buff.name}${stacks > 0 ? ` (${stacks + 1})` : ''}`}</Txt>
            <Txt variant="caption" color="dim">{`${buff.rarity.toLowerCase()} · ${buff.description}`}</Txt>
          </Pressable>
        );
      })}
      {choices.length === 0 && <Btn label="Close" onPress={done} />}
      <Txt
        variant="caption"
        color="dim">{`odds per slot: common ${pct(DRAFT_WEIGHTS.COMMON)} · rare ${pct(DRAFT_WEIGHTS.RARE)} · legendary ${pct(DRAFT_WEIGHTS.LEGENDARY)}`}</Txt>
    </View>
  );
}

interface PullView {
  itemId: string;
  name: string;
  rarity: string;
  outcome: string;
  stars: number;
  gold: number;
  dust: number;
}

function ChestBody({ event, done }: { event: UIEvent; done: () => void }) {
  const p = event.payload;
  const pulls = (p.pulls as PullView[]) ?? [];
  const pity = useCore((s) => s.state.pity[String(p.bannerId)] ?? { pullsSinceLastEpic: 0, pullsSinceLastLegendary: 0 });
  const luck = coreController.getEffectivePlayerStats().effectiveLuck;
  const [shown, setShown] = useState(0);

  // the slots flip over one after another
  useEffect(() => {
    if (shown >= pulls.length) return;
    const t = setTimeout(() => {
      tick();
      setShown((n) => n + 1);
    }, 320);
    return () => clearTimeout(t);
  }, [shown, pulls.length]);

  const banner = BANNER_BY_ID.get(String(p.bannerId));
  const odds = banner ? applyPityMath(banner.baseWeights, pity) : null;
  const tiers = chestTierWeights(luck);
  return (
    <View style={styles.body}>
      <Txt color="dim">{`${String(p.slotCount)}-slot chest · ${String(p.source).toLowerCase().replace('_', ' ')}`}</Txt>
      {pulls.map((pull, i) => (
        <View key={`${pull.itemId}-${i}`} style={[styles.slot, { borderColor: i < shown ? CORE_RARITY_COLOR[pull.rarity] : 'rgba(127,127,127,0.3)' }]}>
          {i < shown ? (
            <>
              <Txt variant="bodyStrong" color={CORE_RARITY_COLOR[pull.rarity]}>
                {pull.name}
              </Txt>
              <Txt variant="caption" color="dim">
                {pull.outcome === 'NEW'
                  ? `${pull.rarity.toLowerCase()} · new · ★1`
                  : pull.outcome === 'ASCENDED'
                    ? `${pull.rarity.toLowerCase()} · ascended to ${'★'.repeat(pull.stars)}`
                    : `${pull.rarity.toLowerCase()} · maxed · +${pull.gold} gold +${pull.dust} dust`}
              </Txt>
            </>
          ) : (
            <Txt variant="caption" color="dim">
              ?
            </Txt>
          )}
        </View>
      ))}
      {shown >= pulls.length && (Number(p.goldTotal) > 0 || Number(p.dustTotal) > 0) && (
        <Txt variant="bodyStrong" color={RARITY_COLOR.legendary}>{`overflow: +${String(p.goldTotal)} gold · +${String(p.dustTotal)} pixel dust`}</Txt>
      )}
      {odds && (
        <Txt variant="caption" color="dim">
          {`next pull odds: common ${pct(odds.COMMON)} · rare ${pct(odds.RARE)} · epic ${pct(odds.EPIC)} · legendary ${pct(odds.LEGENDARY)}`}
        </Txt>
      )}
      <Txt variant="caption" color="dim">
        {`chest size odds: 1-slot ${pct(tiers.SINGLE_1)} · 3-slot ${pct(tiers.TRIPLE_3)} · 5-slot ${pct(tiers.JACKPOT_5)}`}
      </Txt>
      <Txt variant="caption" color="dim">
        {`pity: epic guaranteed within ${PITY.hardEpic - pity.pullsSinceLastEpic} · legendary within ${PITY.hardLegendary - pity.pullsSinceLastLegendary} (odds rise from pull ${PITY.softLegendaryStart})`}
      </Txt>
      <Txt variant="caption" color="dim">
        {IN_APP_NOTE}
      </Txt>
      <Btn label={shown >= pulls.length ? 'Collect' : 'Skip'} onPress={() => (shown >= pulls.length ? done() : setShown(pulls.length))} />
    </View>
  );
}

function SummaryBody({ event, done }: { event: UIEvent; done: () => void }) {
  const p = event.payload;
  const summary = (p.summary ?? {}) as Record<string, number | boolean>;
  const payout = (p.payout ?? { gold: 0, breakdown: {} }) as { gold: number; breakdown: Record<string, number> };
  const shields = useCore((s) => s.state.meta.streak.shields.length);
  return (
    <View style={styles.body}>
      <Txt>{`yesterday: level ${String(summary.level)} · ${String(summary.tasks)} logs · ${Math.round(Number(summary.xp))} xp`}</Txt>
      <Txt variant="bodyStrong" color={RARITY_COLOR.legendary}>{`+${payout.gold} gold`}</Txt>
      <Txt
        variant="caption"
        color="dim">{`from logs ${payout.breakdown.fromActions ?? 0} · levels ${payout.breakdown.fromLevels ?? 0} · milestones ${payout.breakdown.fromMilestones ?? 0}`}</Txt>
      <Txt>{`streak ${String(p.streak)} (best ${String(p.bestStreak)})`}</Txt>
      {Number(p.missedDays) > 0 && <Txt color="dim">{`missed days: ${String(p.missedDays)} · shields used: ${String(p.shieldsUsed)}`}</Txt>}
      <Txt variant="caption" color="dim">{`streak shields left: ${shields}`}</Txt>
      <Btn label="New day" onPress={done} />
    </View>
  );
}

const TITLE: Record<UIEvent['type'], { title: string; icon: string }> = {
  DRAFT_READY: { title: 'Level up', icon: 'cards' },
  EVOLUTION_TRIGGERED: { title: 'Synergy', icon: 'atom-variant' },
  CHEST_OPENED: { title: 'Treasure chest', icon: 'treasure-chest' },
  ERA_UNLOCKED: { title: 'Era unlocked', icon: 'gamepad-variant' },
  DAY_SUMMARY_PAYOUT: { title: 'Day settled', icon: 'weather-sunset' },
};

/**
 * Plays the core engine's UI events one at a time: drafts, synergies, chests, era unlocks and
 * the daily payout. Each is acknowledged before the next can show, with a short lock between.
 */
export function UIEventHost() {
  const { colors } = useTheme();
  const ready = useCore((s) => s.ready);
  const head = useCore((s) => s.state.uiQueue.events[0] ?? null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(() => setLocked(false), LOCK_MS);
    return () => clearTimeout(t);
  }, [locked]);

  const visible = ready && !!head && !locked;
  const done = () => {
    if (!head || locked) return;
    coreController.acknowledgeUIEvent(head.id);
    setLocked(true);
  };

  let body: React.ReactNode = null;
  if (head) {
    const p = head.payload;
    switch (head.type) {
      case 'DRAFT_READY':
        body = <DraftBody event={head} done={done} />;
        break;
      case 'CHEST_OPENED':
        body = <ChestBody key={head.id} event={head} done={done} />;
        break;
      case 'DAY_SUMMARY_PAYOUT':
        body = <SummaryBody event={head} done={done} />;
        break;
      case 'EVOLUTION_TRIGGERED':
        body = (
          <View style={styles.body}>
            <Txt variant="title" size={18} color={RARITY_COLOR.legendary}>
              {String(p.name)}
            </Txt>
            <Txt color="dim">{String(p.description)}</Txt>
            {Array.isArray(p.autoCompleted) && p.autoCompleted.length > 0 && (
              <Txt variant="caption" color="dim">{`done for you: ${p.autoCompleted.length} chores`}</Txt>
            )}
            <Btn label="Nice" onPress={done} />
          </View>
        );
        break;
      case 'ERA_UNLOCKED':
        body = (
          <View style={styles.body}>
            <Txt variant="title" size={18}>{`${String(p.name)} era`}</Txt>
            <Txt color="dim">its items can now drop from chests and banners, and its relics count when you play in one of its themes.</Txt>
            <Btn label="Open" onPress={done} />
          </View>
        );
        break;
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (head?.type !== 'DRAFT_READY') done();
      }}
      statusBarTranslucent>
      <View style={[styles.scrim, { backgroundColor: colors.overlay }]}>
        <View style={[styles.box, { backgroundColor: colors.bg, borderRadius: 12 }]}>
          {head && (
            <Panel title={TITLE[head.type].title} icon={TITLE[head.type].icon}>
              {body}
            </Panel>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 420 },
  body: { gap: 10 },
  choice: { borderWidth: 2, borderRadius: 8, padding: 12, gap: 2 },
  slot: { borderWidth: 2, borderRadius: 6, padding: 10, minHeight: 48, justifyContent: 'center' },
});
