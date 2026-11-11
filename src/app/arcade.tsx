import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CRATES } from '@/arcade/crates';
import { LOOT } from '@/arcade/loot';
import { AP_PER_KEY, BOX_PRICE, canClaimDaily, KEY_PRICE } from '@/arcade/rules';
import { Btn } from '@/components/Btn';
import { Divider, Row } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useClock } from '@/hooks/useClock';
import { useWallet } from '@/hooks/useWallet';
import { useArcade } from '@/store/useArcade';
import { useTheme } from '@/theme/ThemeProvider';

function Balance({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <View style={styles.balance} accessible accessibilityLabel={`${value} ${label}`}>
      <Icon name={icon} size={20} color={color} />
      <Txt variant="number" size={22}>
        {value}
      </Txt>
      <Txt variant="label" size={9.5} color="dim">
        {label}
      </Txt>
    </View>
  );
}

export default function Arcade() {
  const { colors } = useTheme();
  const router = useRouter();
  const wallet = useWallet();
  const { today } = useClock();
  const data = useArcade((s) => s.data);
  const buyKey = useArcade((s) => s.buyKey);
  const buyBox = useArcade((s) => s.buyBox);
  const claimDaily = useArcade((s) => s.claimDaily);
  const chevron = <Icon name="chevron-right" size={24} color={colors.textDim} />;

  return (
    <Screen title="Arcade" subtitle="Spend what your quests earn" back>
      <Panel>
        <View style={styles.balances}>
          <Balance icon="key-variant" value={wallet.keys} label="keys" color={colors.gold} />
          <Balance icon="gift" value={wallet.boxes} label="loot boxes" color={colors.accentAlt} />
          <Balance icon="diamond-stone" value={wallet.shards} label="shards" color={colors.platinum} />
        </View>
        <Txt variant="caption" color="dim" style={styles.how}>
          {`A key for every ${AP_PER_KEY} AP. A loot box for every level and every milestone. Shards come from scrapped items and duplicates.`}
        </Txt>
        <View style={styles.buttons}>
          <Btn
            label={`Key · ${KEY_PRICE} shards`}
            icon="key-plus"
            size="sm"
            variant="secondary"
            disabled={wallet.shards < KEY_PRICE}
            onPress={buyKey}
            style={styles.button}
          />
          <Btn
            label={`Box · ${BOX_PRICE} shards`}
            icon="gift-outline"
            size="sm"
            variant="secondary"
            disabled={wallet.shards < BOX_PRICE}
            onPress={buyBox}
            style={styles.button}
          />
        </View>
        {wallet.plus && (
          <Btn
            label={canClaimDaily(data, today) ? 'Claim daily key' : 'Daily key claimed'}
            icon="calendar-star"
            size="sm"
            disabled={!canClaimDaily(data, today)}
            onPress={() => claimDaily(today)}
            style={styles.daily}
          />
        )}
      </Panel>

      <Panel title="Crates" icon="package-variant-closed">
        {CRATES.map((crate, i) => (
          <View key={crate.id}>
            {i > 0 && <Divider />}
            <Row
              icon={crate.plus ? 'diamond-stone' : 'package-variant-closed'}
              iconColor={crate.plus ? colors.platinum : colors.gold}
              title={crate.plus && !wallet.plus ? `${crate.name} · plus` : crate.name}
              subtitle={crate.blurb}
              onPress={() => router.push({ pathname: '/crate', params: { id: crate.id } })}
              right={chevron}
              accessibilityLabel={`Open the ${crate.name} crate`}
            />
          </View>
        ))}
      </Panel>

      <Panel title="Loot box" icon="gift">
        <Row
          icon="gift"
          iconColor={colors.accentAlt}
          title="Open loot boxes"
          subtitle="Four items a box: titles, emblems, banners and stickers."
          onPress={() => router.push('/lootbox')}
          right={chevron}
        />
      </Panel>

      <Panel title="Yours" icon="treasure-chest">
        <Row
          icon="pistol"
          title="Inventory"
          subtitle={`${data.inventory.length} ${data.inventory.length === 1 ? 'item' : 'items'} from ${data.cratesOpened} crates`}
          onPress={() => router.push('/inventory')}
          right={chevron}
        />
        <Divider />
        <Row
          icon="cards"
          title="Collection"
          subtitle={`${Object.keys(data.collection).length} of ${LOOT.length} collected`}
          onPress={() => router.push('/collection')}
          right={chevron}
        />
        <Divider />
        <Row
          icon="star-four-points"
          iconColor={colors.gold}
          title={wallet.plus ? 'Achievl plus · active' : 'Achievl plus and packs'}
          subtitle="Daily key, the prism crate, quick open and more."
          onPress={() => router.push('/store')}
          right={chevron}
        />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balances: { flexDirection: 'row' },
  balance: { flex: 1, alignItems: 'center', gap: 2 },
  how: { marginTop: 12 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  button: { flex: 1 },
  daily: { marginTop: 8 },
});
