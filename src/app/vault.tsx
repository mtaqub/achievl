import React from 'react';
import { StyleSheet, View } from 'react-native';

import { tick } from '@/arcade/ui/feedback';
import { bannerPool } from '@/core/gacha';
import { upgradeCost, upgradeLevel } from '@/core/meta';
import { BANNERS, GLOBAL_UPGRADES, ITEM_BY_ID, RETRO_ERAS, STANDARD_WEIGHTS } from '@/core/registry';
import { Btn } from '@/components/Btn';
import { Divider } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { CORE_RARITY_COLOR } from '@/components/UIEventHost';
import { coreController, useCore } from '@/store/useCore';

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export default function Vault() {
  const state = useCore((s) => s.state);
  const { meta, inventory } = state;
  const owned = Object.values(inventory.items)
    .map((i) => ({ owned: i, item: ITEM_BY_ID.get(i.itemId) }))
    .filter((r): r is { owned: typeof r.owned; item: NonNullable<typeof r.item> } => !!r.item);

  return (
    <Screen title="Vault" subtitle={`${meta.gold} gold · ${meta.pixelDust} pixel dust`} back>
      <Panel title="Upgrades" icon="arrow-up-bold-box">
        {GLOBAL_UPGRADES.map((u, i) => {
          const level = upgradeLevel(meta, u.id);
          const maxed = level >= u.maxLevel;
          const cost = upgradeCost(u, level);
          return (
            <View key={u.id}>
              {i > 0 && <Divider />}
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Txt variant="bodyStrong">{`${u.name} ${level}/${u.maxLevel}`}</Txt>
                  <Txt variant="caption" color="dim">
                    {u.description}
                  </Txt>
                </View>
                <Btn
                  label={maxed ? 'Max' : `${cost} gold`}
                  size="sm"
                  disabled={maxed || meta.gold < cost}
                  onPress={() => {
                    tick();
                    coreController.purchaseUpgrade(u.id);
                  }}
                />
              </View>
            </View>
          );
        })}
      </Panel>

      <Panel title="Banners" icon="slot-machine">
        {BANNERS.map((b, i) => {
          const available = bannerPool(b, meta.unlockedEras).length > 0;
          return (
            <View key={b.id}>
              {i > 0 && <Divider />}
              <View style={styles.banner}>
                <Txt variant="bodyStrong">{b.name}</Txt>
                <Txt variant="caption" color="dim">
                  {available ? `${b.goldCost} gold a pull` : 'locked: unlock its era first'}
                </Txt>
                <View style={styles.row}>
                  {([1, 3, 5] as const).map((n) => (
                    <Btn
                      key={n}
                      label={`x${n}`}
                      size="sm"
                      variant="secondary"
                      style={styles.flex}
                      disabled={!available || meta.gold < b.goldCost * n}
                      onPress={() => {
                        tick();
                        coreController.purchasePulls(b.id, n);
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          );
        })}
        <Divider />
        <Txt variant="caption" color="dim" style={styles.note}>
          {`base odds: common ${pct(STANDARD_WEIGHTS.COMMON)} · rare ${pct(STANDARD_WEIGHTS.RARE)} · epic ${pct(STANDARD_WEIGHTS.EPIC)} · legendary ${pct(STANDARD_WEIGHTS.LEGENDARY)}. an epic is guaranteed within 10 pulls and a legendary within 50, with legendary odds rising from pull 35. pulls use gold earned in the app only; items exist only inside achievl and cannot be traded or cashed out.`}
        </Txt>
      </Panel>

      <Panel title="Eras" icon="gamepad-variant">
        {RETRO_ERAS.map((era) => {
          const unlocked = meta.unlockedEras.includes(era.id);
          const need = Object.entries(era.unlock)
            .map(([k, v]) => `${v} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
            .join(', ');
          return (
            <Txt key={era.id} color={unlocked ? 'text' : 'dim'}>
              {`${era.name}${era.id === meta.activeEra ? ' · active' : ''}${unlocked ? '' : ` · needs ${need}`}`}
            </Txt>
          );
        })}
        <Txt variant="caption" color="dim" style={styles.note}>
          the active era follows your theme. relics from the active era add +0.5% xp per star.
        </Txt>
      </Panel>

      <Panel title="Collection" icon="cards">
        {owned.length === 0 ? (
          <Txt color="dim">boss tasks and synergies drop treasure chests. what you pull lands here.</Txt>
        ) : (
          owned
            .sort((a, b) => b.owned.ascensionLevel - a.owned.ascensionLevel)
            .map(({ owned: o, item }) => (
              <View key={item.id} style={styles.row}>
                <Txt color={CORE_RARITY_COLOR[item.rarity]} style={styles.flex}>
                  {item.name}
                </Txt>
                <Txt variant="caption" color="dim">{`${item.kind.toLowerCase()} · ${'★'.repeat(o.ascensionLevel)}`}</Txt>
              </View>
            ))
        )}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  banner: { gap: 4, paddingVertical: 8 },
  note: { marginTop: 8 },
});
