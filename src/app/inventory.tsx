import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dropValue, findCrateItem, wearGrade } from '@/arcade/rules';
import { RARITY_COLOR, RARITY_ORDER } from '@/arcade/types';
import { Tile } from '@/arcade/ui/Tile';
import { hashText } from '@/arcade/ui/Weapon';
import { Btn } from '@/components/Btn';
import { Divider } from '@/components/controls';
import { confirm } from '@/components/Dialog';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useArcade } from '@/store/useArcade';

export default function Inventory() {
  const inventory = useArcade((s) => s.data.inventory);
  const shards = useArcade((s) => s.data.shards);
  const scrap = useArcade((s) => s.scrap);
  const router = useRouter();

  const rows = inventory
    .map((drop) => ({ drop, item: findCrateItem(drop.itemId) }))
    .filter((row): row is { drop: typeof row.drop; item: NonNullable<typeof row.item> } => !!row.item)
    // Best first, then newest.
    .sort((a, b) => RARITY_ORDER.indexOf(b.item.rarity) - RARITY_ORDER.indexOf(a.item.rarity) || b.drop.at - a.drop.at);
  const commons = rows.filter((r) => r.item.rarity === 'common');
  const commonsValue = commons.reduce((sum, r) => sum + dropValue(r.drop), 0);

  return (
    <Screen title="Inventory" subtitle={`${rows.length} ${rows.length === 1 ? 'item' : 'items'} · ${shards} shards`} back>
      {rows.length === 0 ? (
        <Panel>
          <Txt color="dim">Nothing here yet. Everything you unbox and keep lands in this list.</Txt>
        </Panel>
      ) : (
        <>
          {commons.length > 1 && (
            <Btn
              label={`Scrap ${commons.length} commons · ${commonsValue} shards`}
              icon="hammer"
              variant="secondary"
              onPress={() =>
                confirm({
                  title: 'Scrap every common?',
                  message: `${commons.length} common items become ${commonsValue} shards. This cannot be undone.`,
                  confirmLabel: 'Scrap',
                  danger: true,
                  onConfirm: () => scrap(commons.map((r) => r.drop.uid)),
                })
              }
            />
          )}
          <Panel>
            {rows.map(({ drop, item }, i) => (
              <View key={drop.uid}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <Pressable
                    style={styles.open}
                    onPress={() => router.push({ pathname: '/inspect', params: { uid: drop.uid } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Inspect ${item.weapon} ${item.finish}`}>
                    <Tile item={item} uid={`inv-${drop.uid}`} foil={drop.foil} width={84} wear={drop.wear} seed={hashText(drop.uid)} />
                    <View style={styles.text}>
                      <Txt variant="bodyStrong" numberOfLines={2} color={drop.foil ? '#E08A1E' : 'text'}>
                        {`${drop.foil ? '★ ' : ''}${item.weapon} | ${item.finish}`}
                      </Txt>
                      <Txt variant="caption" color={RARITY_COLOR[item.rarity]}>
                        {item.rarity}
                      </Txt>
                      <Txt variant="caption" color="dim">
                        {`${wearGrade(drop.wear)} · ${drop.wear.toFixed(4)}`}
                      </Txt>
                    </View>
                  </Pressable>
                  <Btn
                    label={`${dropValue(drop)}`}
                    icon="hammer"
                    size="sm"
                    variant="secondary"
                    onPress={() => scrap([drop.uid])}
                    accessibilityLabel={`Scrap ${item.weapon} ${item.finish} for ${dropValue(drop)} shards`}
                  />
                </View>
              </View>
            ))}
          </Panel>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 2 },
});
