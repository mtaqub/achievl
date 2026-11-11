import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { KIND_INFO } from '@/arcade/loot';
import { BOX_ODDS, BOX_SIZE, WISH_WEIGHT } from '@/arcade/rules';
import { BoxPull, LOOT_KINDS, LootKind, RARITY_COLOR } from '@/arcade/types';
import { reveal } from '@/arcade/ui/feedback';
import { LootBox } from '@/arcade/ui/LootBox';
import { LootCard } from '@/arcade/ui/LootCard';
import { Btn } from '@/components/Btn';
import { Divider, IconTile } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useWallet } from '@/hooks/useWallet';
import { useArcade } from '@/store/useArcade';
import { useTheme } from '@/theme/ThemeProvider';

const LEVEL = { common: 0, rare: 2, epic: 3, legendary: 4 } as const;
const REVEAL_GAP_MS = 520;

/** Pops its content in when it first appears. */
function Pop({ children }: { children: React.ReactNode }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 6, tension: 120, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [v]);
  return <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>{children}</Animated.View>;
}

/** The intro form: what should the box lean towards? */
function WishForm({ initial, onSave }: { initial: LootKind[]; onSave: (wishes: LootKind[]) => void }) {
  const { colors } = useTheme();
  const [picked, setPicked] = useState<LootKind[]>(initial);
  const toggle = (kind: LootKind) => setPicked((now) => (now.includes(kind) ? now.filter((k) => k !== kind) : [...now, kind]));
  return (
    <Panel title="What do you want to collect?" icon="clipboard-list">
      <Txt color="dim">
        {`Pick what you are after and the box leans that way: anything you choose is ${WISH_WEIGHT} times as likely as the rest. Pick nothing for an even mix. You can change this any time.`}
      </Txt>
      <View style={styles.wishes}>
        {LOOT_KINDS.map((kind, i) => {
          const on = picked.includes(kind);
          return (
            <View key={kind}>
              {i > 0 && <Divider />}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={KIND_INFO[kind].plural}
                onPress={() => toggle(kind)}
                style={styles.wish}>
                <IconTile icon={KIND_INFO[kind].icon} dim={!on} />
                <View style={styles.flex}>
                  <Txt variant="bodyStrong">{KIND_INFO[kind].plural}</Txt>
                  <Txt variant="caption" color="dim">
                    {KIND_INFO[kind].blurb}
                  </Txt>
                </View>
                <Icon name={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={on ? colors.accent : colors.textDim} />
              </Pressable>
            </View>
          );
        })}
      </View>
      <Btn label={picked.length === 0 ? 'Surprise me' : 'Start collecting'} icon="check" onPress={() => onSave(picked)} />
    </Panel>
  );
}

export default function LootBoxScreen() {
  const router = useRouter();
  const wallet = useWallet();
  const wishes = useArcade((s) => s.data.wishes);
  const asked = useArcade((s) => s.data.wishesAsked);
  const openBox = useArcade((s) => s.openBox);
  const setWishes = useArcade((s) => s.setWishes);

  const [editing, setEditing] = useState(false);
  const [pulls, setPulls] = useState<BoxPull[] | null>(null);
  const [burst, setBurst] = useState(false);
  const [shown, setShown] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const open = () => {
    const result = openBox(wallet.earnedBoxes);
    if (typeof result === 'string') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBurst(false);
    setShown(0);
    setPulls(result);
  };

  // Once the orbs have landed, turn them over one at a time.
  const onBurst = () => {
    if (!pulls) return;
    setBurst(true);
    pulls.forEach((pull, i) => {
      timers.current.push(
        setTimeout(
          () => {
            setShown(i + 1);
            reveal(LEVEL[pull.item.rarity]);
          },
          350 + i * REVEAL_GAP_MS
        )
      );
    });
  };

  const opening = !!pulls && shown < BOX_SIZE;
  const finished = !!pulls && shown >= BOX_SIZE;
  const subtitle = `${wallet.boxes} ${wallet.boxes === 1 ? 'box' : 'boxes'} · ${wallet.shards} shards`;

  if (!asked || editing) {
    return (
      <Screen title="Loot box" subtitle={subtitle} back>
        <WishForm
          initial={wishes}
          onSave={(next) => {
            setWishes(next);
            setEditing(false);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Loot box" subtitle={subtitle} back>
      <Panel>
        {!burst ? (
          <LootBox pulls={pulls} onBurst={onBurst} />
        ) : (
          <View style={styles.grid}>
            {pulls!.map((pull, i) => (
              <View key={i} style={styles.cell}>
                {i < shown ? (
                  <Pop>
                    <LootCard item={pull.item} note={pull.duplicate ? `duplicate · +${pull.shards} shards` : 'new'} />
                  </Pop>
                ) : (
                  <View style={styles.waiting}>
                    <View
                      style={[
                        styles.waitingOrb,
                        { backgroundColor: RARITY_COLOR[pull.item.rarity], boxShadow: `0px 0px 18px ${RARITY_COLOR[pull.item.rarity]}` },
                      ]}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
        <View style={styles.actions}>
          <Btn
            label={opening ? 'Opening…' : wallet.boxes > 0 ? (finished ? 'Open another' : 'Open loot box') : 'No boxes left'}
            icon="gift-open"
            disabled={opening || wallet.boxes < 1}
            onPress={open}
            accessibilityLabel="Open loot box"
          />
          {wallet.boxes < 1 && !opening && (
            <Txt variant="caption" color="dim">
              You get a box for every level you gain and every milestone you unlock. Shards buy boxes too, in the arcade.
            </Txt>
          )}
          <View style={styles.row}>
            <Btn label="Collection" icon="cards" variant="secondary" size="sm" style={styles.flex} onPress={() => router.push('/collection')} />
            <Btn
              label="Change wishes"
              icon="clipboard-list"
              variant="secondary"
              size="sm"
              style={styles.flex}
              disabled={opening}
              onPress={() => setEditing(true)}
            />
          </View>
        </View>
      </Panel>

      <Panel title="What is inside" icon="percent">
        <Txt variant="caption" color="dim">
          {`Every box holds ${BOX_SIZE} items, and at least one is rare or better. Each item rolls these odds:`}
        </Txt>
        <View style={styles.odds}>
          {(Object.keys(BOX_ODDS) as (keyof typeof BOX_ODDS)[]).map((rarity) => (
            <View key={rarity} style={styles.oddsRow}>
              <View style={[styles.dot, { backgroundColor: RARITY_COLOR[rarity] }]} />
              <Txt variant="bodyStrong" style={styles.flex}>
                {rarity}
              </Txt>
              <Txt variant="bodyStrong" color={RARITY_COLOR[rarity]}>{`${(BOX_ODDS[rarity] * 100).toFixed(1).replace(/\.0$/, '')}%`}</Txt>
            </View>
          ))}
        </View>
        <Txt variant="caption" color="dim">
          {wishes.length === 0
            ? 'You asked for an even mix, so every kind of item is equally likely.'
            : `You asked for ${wishes.map((k) => KIND_INFO[k].plural).join(', ')}: those are ${WISH_WEIGHT} times as likely as the rest. Wishes never change the rarity odds. Something you already own pays out shards instead.`}
        </Txt>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wishes: { marginVertical: 10 },
  wish: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, rowGap: 10 },
  cell: { width: '50%', paddingHorizontal: 5 },
  waiting: { minHeight: 150, alignItems: 'center', justifyContent: 'center' },
  waitingOrb: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  actions: { gap: 10, marginTop: 14 },
  row: { flexDirection: 'row', gap: 8 },
  odds: { marginVertical: 10, gap: 6 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
