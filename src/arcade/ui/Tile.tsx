import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';

import { CrateItem, RARITY_COLOR } from '../types';
import { Weapon } from './Weapon';

export const TILE_W = 104;
export const TILE_H = 104;

/**
 * One item as it appears on the reel and in the inventory. Tiles are dark in every
 * era so the finishes and the rarity colours always read the same.
 */
export function Tile({
  item,
  uid,
  foil,
  width = TILE_W,
  wear,
  seed,
}: {
  item: CrateItem;
  uid: string;
  foil?: boolean;
  width?: number;
  wear?: number;
  seed?: number;
}) {
  const colour = RARITY_COLOR[item.rarity];
  return (
    <View style={[styles.tile, { width, height: (width / TILE_W) * TILE_H }]}>
      <LinearGradient colors={['#3B4048', '#23262C']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,0,0,0)', `${colour}66`]} style={styles.glow} />
      <View style={styles.art}>
        <Weapon item={item} uid={uid} width={width * 0.8} wear={wear} seed={seed} />
      </View>
      <View style={styles.names}>
        <Txt variant="caption" size={9.5} color={foil ? '#FFB347' : '#FFFFFF'} numberOfLines={1}>
          {foil ? `★ ${item.weapon}` : item.weapon}
        </Txt>
        <Txt variant="caption" size={9.5} color="#C3CAD3" numberOfLines={1}>
          {item.finish}
        </Txt>
      </View>
      <View style={[styles.bar, { backgroundColor: colour }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', borderRadius: 3 },
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  names: { paddingHorizontal: 6, paddingBottom: 7 },
  bar: { height: 4 },
});
