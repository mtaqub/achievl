import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { useTheme } from '@/theme/ThemeProvider';

import { KIND_INFO } from '../loot';
import { LootItem, RARITY_COLOR } from '../types';

/** The picture for a loot item: a quote, a crest, a colour wash or a sticker. */
export function LootArt({ item, size = 64 }: { item: LootItem; size?: number }) {
  const { colors } = useTheme();
  if (item.kind === 'banner' && item.paint) {
    return (
      <LinearGradient colors={item.paint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size * 1.5, height: size * 0.62, borderRadius: 6 }} />
    );
  }
  if (item.kind === 'emblem' && item.paint) {
    return (
      <LinearGradient colors={item.paint} style={[styles.round, { width: size, height: size, borderRadius: size / 2 }]}>
        <Icon name={item.icon ?? 'shield'} size={size * 0.56} color="#FFFFFF" />
      </LinearGradient>
    );
  }
  if (item.kind === 'sticker') return <Icon name={item.icon ?? 'sticker-emoji'} size={size * 0.9} color={RARITY_COLOR[item.rarity]} />;
  return <Icon name="format-quote-close" size={size * 0.8} color={colors.textDim} />;
}

/** A loot item as a card. `locked` shows an uncollected slot without giving the item away. */
export function LootCard({ item, note, locked }: { item: LootItem; note?: string; locked?: boolean }) {
  const { colors, shape } = useTheme();
  const colour = RARITY_COLOR[item.rarity];
  return (
    <View style={[styles.card, { borderRadius: shape.radius, borderColor: locked ? colors.insetBorder : colour, backgroundColor: colors.inset }]}>
      <View style={[styles.stripe, { backgroundColor: locked ? colors.insetBorder : colour }]} />
      <View style={styles.art}>{locked ? <Icon name="help" size={34} color={colors.textDim} /> : <LootArt item={item} />}</View>
      <Txt variant="bodyStrong" size={13} center numberOfLines={2} color={locked ? 'dim' : 'text'}>
        {locked ? '???' : item.name}
      </Txt>
      <Txt variant="caption" size={10.5} center color={locked ? 'dim' : colour}>
        {`${item.rarity} ${KIND_INFO[item.kind].label}`}
      </Txt>
      {note ? (
        <Txt variant="caption" size={10.5} center color="dim">
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  round: { alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, overflow: 'hidden', paddingBottom: 10, paddingHorizontal: 8, gap: 3, minHeight: 150 },
  stripe: { height: 5, marginHorizontal: -8 },
  art: { height: 78, alignItems: 'center', justifyContent: 'center' },
});
