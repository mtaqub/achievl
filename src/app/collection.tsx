import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { KIND_INFO, LOOT } from '@/arcade/loot';
import { LOOT_KINDS } from '@/arcade/types';
import { LootCard } from '@/arcade/ui/LootCard';
import { Panel } from '@/components/Panel';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { useArcade } from '@/store/useArcade';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

export default function Collection() {
  const { colors } = useTheme();
  const collection = useArcade((s) => s.data.collection);
  const motto = useGame((s) => s.data.profile.motto);
  const setProfile = useGame((s) => s.setProfile);
  const owned = Object.keys(collection).length;

  return (
    <Screen title="Collection" subtitle={`${owned} of ${LOOT.length} collected`} back>
      {LOOT_KINDS.map((kind) => {
        const items = LOOT.filter((item) => item.kind === kind);
        const have = items.filter((item) => collection[item.id]).length;
        return (
          <Panel
            key={kind}
            title={KIND_INFO[kind].plural}
            icon={KIND_INFO[kind].icon}
            right={<Txt variant="heading" size={14} color={colors.headerText}>{`${have}/${items.length}`}</Txt>}>
            {kind === 'title' && (
              <Txt variant="caption" color="dim" style={styles.hint}>
                Tap a title you own to wear it as your motto.
              </Txt>
            )}
            <View style={styles.grid}>
              {items.map((item) => {
                const mine = !!collection[item.id];
                const wearing = kind === 'title' && mine && motto === item.name;
                const card = <LootCard item={item} locked={!mine} note={wearing ? 'wearing' : undefined} />;
                return (
                  <View key={item.id} style={styles.cell}>
                    {kind === 'title' && mine ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Wear ${item.name} as your motto`}
                        onPress={() => setProfile({ motto: item.name })}>
                        {card}
                      </Pressable>
                    ) : (
                      card
                    )}
                  </View>
                );
              })}
            </View>
          </Panel>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, rowGap: 8 },
  cell: { width: '33.333%', paddingHorizontal: 4 },
});
