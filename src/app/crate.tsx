import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { crateById } from '@/arcade/crates';
import { crateOddsTable, FOIL_CHANCE, shardValue, Spin, wearGrade } from '@/arcade/rules';
import { RARITY_COLOR } from '@/arcade/types';
import { reveal } from '@/arcade/ui/feedback';
import { Reel } from '@/arcade/ui/Reel';
import { Weapon } from '@/arcade/ui/Weapon';
import { Btn } from '@/components/Btn';
import { Chip, Divider, Segmented } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useWallet } from '@/hooks/useWallet';
import { useArcade } from '@/store/useArcade';

const LEVEL = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 } as const;
const percent = (chance: number) => `${(chance * 100).toFixed(2).replace(/\.?0+$/, '')}%`;

export default function CrateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const crate = crateById(id ?? '');
  const wallet = useWallet();
  const quickOpen = useArcade((s) => s.data.quickOpen);
  const openCrate = useArcade((s) => s.openCrate);
  const setQuickOpen = useArcade((s) => s.setQuickOpen);
  const scrap = useArcade((s) => s.scrap);

  const [spin, setSpin] = useState<Spin | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<Spin | null>(null);

  if (!crate) {
    return (
      <Screen title="Crate" back>
        <Txt color="dim">That crate does not exist.</Txt>
      </Screen>
    );
  }

  const locked = !!crate.plus && !wallet.plus;
  const preview = Array.from({ length: 12 }, (_, i) => crate.items[(i * 7) % crate.items.length]);

  const open = () => {
    const result = openCrate(crate.id, wallet.earnedKeys);
    if (typeof result === 'string') return;
    setLanded(null);
    setSpinning(true);
    setSpin(result);
  };

  const onStop = () => {
    if (!spin) return;
    setSpinning(false);
    setLanded(spin);
    reveal(LEVEL[spin.item.rarity]);
  };

  const value = landed ? shardValue(landed.item, landed.drop.wear, landed.drop.foil) : 0;

  return (
    <Screen title={crate.name} subtitle={`${wallet.keys} ${wallet.keys === 1 ? 'key' : 'keys'} · ${wallet.shards} shards`} back>
      <Panel>
        <View style={styles.block}>
          <Reel spin={spin} preview={preview} quick={quickOpen && wallet.plus} onStop={onStop} />
          {locked ? (
            <Btn label="Unlock with plus" icon="star-four-points" onPress={() => router.push('/store')} />
          ) : (
            <Btn
              label={spinning ? 'Opening…' : wallet.keys > 0 ? 'Open · 1 key' : 'No keys left'}
              icon="key-variant"
              disabled={spinning || wallet.keys < 1}
              onPress={open}
              accessibilityLabel="Open crate"
            />
          )}
          {wallet.keys < 1 && !locked && !spinning && (
            <View style={styles.block}>
              <Txt variant="caption" color="dim">
                You earn a key for every 25 AP, so clearing quests is the way to get more. Shards from scrapped items buy keys too.
              </Txt>
              <Btn label="Get keys" icon="storefront" variant="secondary" size="sm" onPress={() => router.push('/arcade')} />
            </View>
          )}
          {wallet.plus && (
            <Segmented
              options={[
                { value: 'reel', label: 'Full reel', icon: 'movie-roll' },
                { value: 'quick', label: 'Quick open', icon: 'fast-forward' },
              ]}
              value={quickOpen ? 'quick' : 'reel'}
              onChange={(v) => setQuickOpen(v === 'quick')}
            />
          )}
        </View>
      </Panel>

      {landed && (
        <Panel title="You unboxed" icon="package-variant">
          <View style={styles.result}>
            <View style={[styles.showcase, { borderColor: RARITY_COLOR[landed.item.rarity] }]}>
              <Weapon item={landed.item} uid="result" width={230} />
            </View>
            <Txt variant="title" size={18} center color={landed.drop.foil ? '#FFB347' : 'text'}>
              {`${landed.drop.foil ? '★ ' : ''}${landed.item.weapon} | ${landed.item.finish}`}
            </Txt>
            <View style={styles.chips}>
              <Chip label={landed.item.rarity} color={RARITY_COLOR[landed.item.rarity]} filled />
              <Chip label={`${wearGrade(landed.drop.wear)} · ${landed.drop.wear.toFixed(4)}`} />
              {landed.drop.foil && <Chip label="foil" icon="star-four-points" color="#FFB347" />}
            </View>
            <View style={styles.buttons}>
              <Btn
                label={`Scrap +${value}`}
                accessibilityLabel={`Scrap for ${value} shards`}
                icon="hammer"
                variant="secondary"
                style={styles.button}
                onPress={() => {
                  scrap([landed.drop.uid]);
                  setLanded(null);
                }}
              />
              <Btn label="Keep" icon="check" style={styles.button} onPress={() => setLanded(null)} />
            </View>
          </View>
        </Panel>
      )}

      <Panel title="Contents and odds" icon="percent">
        {crateOddsTable(crate).map((row, i) => (
          <View key={row.rarity}>
            {i > 0 && <Divider />}
            <View style={styles.odds}>
              <View style={styles.oddsHead}>
                <View style={[styles.dot, { backgroundColor: RARITY_COLOR[row.rarity] }]} />
                <Txt variant="bodyStrong" style={styles.flex}>
                  {row.rarity}
                </Txt>
                <Txt variant="bodyStrong" color={RARITY_COLOR[row.rarity]}>
                  {percent(row.chance)}
                </Txt>
              </View>
              {row.items.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Weapon item={item} uid={`list-${item.id}`} width={56} />
                  <Txt variant="caption" color="dim" style={styles.flex} numberOfLines={1}>
                    {`${item.weapon} | ${item.finish}`}
                  </Txt>
                  <Txt variant="caption" color="dim">
                    {percent(row.chance / row.items.length)}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        ))}
        <Divider />
        <Txt variant="caption" color="dim" style={styles.note}>
          {`Every opening rolls these odds fresh. ${percent(FOIL_CHANCE)} of drops are the foil variant (★), and wear is a random number from 0 (mint) to 1 (battered). Items exist only inside Achievl and cannot be traded or cashed out.`}
        </Txt>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: 12 },
  result: { gap: 12, alignItems: 'center' },
  showcase: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 18, backgroundColor: '#1B1D22', borderBottomWidth: 4, borderRadius: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  button: { flex: 1 },
  odds: { paddingVertical: 10, gap: 6 },
  oddsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20 },
  note: { paddingTop: 10 },
});
