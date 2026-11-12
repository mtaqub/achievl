import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { heldLayer, loadoutFor } from '@/arcade/loadout';
import { RARITY_COLOR } from '@/arcade/types';
import { LiveAvatar } from '@/avatar/LiveAvatar';
import { useArcade } from '@/store/useArcade';
import { useAvatar } from '@/store/useAvatar';

import { Btn } from './Btn';
import { Panel } from './Panel';
import { Txt } from './Txt';

/** The home page's character: the avatar holding the equipped weapon, and the way into Dead Hours. */
export function LoadoutPanel() {
  const router = useRouter();
  const look = useAvatar((s) => s.look);
  const inventory = useArcade((s) => s.data.inventory);
  const equipped = useArcade((s) => s.data.equipped);
  const best = useArcade((s) => s.data.bestRun);
  const loadout = useMemo(() => loadoutFor(inventory, equipped), [inventory, equipped]);
  const held = useMemo(() => [heldLayer(loadout)], [loadout]);
  const minutes = best ? `${Math.floor(best.seconds / 60)}:${String(Math.floor(best.seconds % 60)).padStart(2, '0')}` : null;

  return (
    <Panel title="Loadout" icon="account-cowboy-hat">
      <View style={styles.row}>
        <View style={styles.stage}>
          <LiveAvatar look={look} size={150} extra={held} />
        </View>
        <View style={styles.side}>
          <Txt variant="caption" color="dim">
            equipped
          </Txt>
          <Txt variant="bodyStrong" color={RARITY_COLOR[loadout.item.rarity]} numberOfLines={2}>
            {`${loadout.drop?.foil ? '★ ' : ''}${loadout.item.weapon} | ${loadout.item.finish}`}
          </Txt>
          <Txt variant="caption" color="dim">
            {minutes ? `best night ${minutes}${best?.won ? ' · survived' : ''} · ${best?.kills} kills` : 'your stats power every run'}
          </Txt>
          <Btn label="Dead hours" icon="skull" size="sm" onPress={() => router.push('/survivor')} />
          <View style={styles.pair}>
            <Btn label="Look" icon="account-edit" size="sm" variant="secondary" style={styles.flex} onPress={() => router.push('/avatar')} />
            <Btn label="Guns" icon="pistol" size="sm" variant="secondary" style={styles.flex} onPress={() => router.push('/inventory')} />
          </View>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stage: { width: 150, height: 150, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.18)' },
  side: { flex: 1, gap: 6 },
  pair: { flexDirection: 'row', gap: 6 },
  flex: { flex: 1 },
});
