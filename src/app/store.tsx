import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PLUS_ID, PLUS_PERKS, Product, PRODUCTS } from '@/arcade/premium';
import { Btn } from '@/components/Btn';
import { Divider, Row, Segmented } from '@/components/controls';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { purchases } from '@/services/purchases';
import { useArcade } from '@/store/useArcade';
import { useTheme } from '@/theme/ThemeProvider';

export default function Store() {
  const { colors } = useTheme();
  const plus = useArcade((s) => s.data.plus);
  const grant = useArcade((s) => s.grant);
  const previewPlus = useArcade((s) => s.previewPlus);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const buy = async (product: Product) => {
    setBusy(product.id);
    setMessage(null);
    const result = await purchases.buy(product.id);
    setBusy(null);
    if (result === 'bought') {
      grant(product.id);
      setMessage(`${product.name} added.`);
    } else if (result === 'unavailable') {
      setMessage('Purchases are not switched on in this build yet.');
    }
  };

  const packs = PRODUCTS.filter((p) => p.kind === 'consumable');
  const subscription = PRODUCTS.find((p) => p.id === PLUS_ID)!;
  const buyLabel = purchases.available ? 'Buy' : 'Soon';

  return (
    <Screen title="Store" subtitle={plus ? 'Achievl plus is active' : 'Achievl plus and packs'} back>
      {!purchases.available && (
        <Panel>
          <Txt color="dim">
            Purchases are not switched on in this build yet, so nothing here can be bought and nothing is charged. Everything in the arcade can still be earned
            by playing.
          </Txt>
        </Panel>
      )}

      <Panel title="Achievl plus" icon="star-four-points">
        {PLUS_PERKS.map((perk, i) => (
          <View key={perk.title}>
            {i > 0 && <Divider />}
            <Row icon={perk.icon} iconColor={colors.gold} title={perk.title} subtitle={perk.blurb} />
          </View>
        ))}
        <Btn
          label={plus ? 'Plus is active' : purchases.available ? 'Subscribe' : 'Coming soon'}
          icon="star-four-points"
          disabled={plus || !purchases.available || busy !== null}
          onPress={() => buy(subscription)}
          style={styles.subscribe}
        />
      </Panel>

      <Panel title="Packs" icon="shopping">
        {packs.map((product, i) => (
          <View key={product.id}>
            {i > 0 && <Divider />}
            <Row
              icon={product.icon}
              title={product.name}
              subtitle={product.blurb}
              right={
                <Btn
                  label={buyLabel}
                  size="sm"
                  disabled={!purchases.available || busy !== null}
                  onPress={() => buy(product)}
                  accessibilityLabel={`Buy ${product.name}`}
                />
              }
            />
          </View>
        ))}
        <Divider />
        <Txt variant="caption" color="dim" style={styles.note}>
          Keys and loot boxes open random items. The odds are listed on every crate and on the loot box screen. Items have no cash value and cannot be traded.
        </Txt>
      </Panel>

      {message && (
        <Panel>
          <Txt>{message}</Txt>
        </Panel>
      )}

      {__DEV__ && (
        <Panel title="Developer preview" icon="wrench">
          <Txt variant="caption" color="dim" style={styles.dev}>
            Only in development builds: try the plus perks without a store.
          </Txt>
          <Segmented
            options={[
              { value: 'off', label: 'Plus off' },
              { value: 'on', label: 'Plus on' },
            ]}
            value={plus ? 'on' : 'off'}
            onChange={(v) => previewPlus(v === 'on')}
          />
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subscribe: { marginTop: 12 },
  note: { paddingTop: 10 },
  dev: { marginBottom: 10 },
});
