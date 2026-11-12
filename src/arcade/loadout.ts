import { CrateItem, Drop } from './types';
import { findCrateItem } from './rules';
import { hashText, weaponVoxels } from './ui/Weapon';
import type { Layer } from '@/voxel/engine';
import { HAND, HAND_AIM } from '@/avatar/model';

/** What the avatar carries when nothing is equipped. */
export const STOCK: CrateItem = {
  id: 'stock:p250',
  weapon: 'p250',
  finish: 'factory issue',
  shape: 'pistol',
  rarity: 'common',
  paint: ['#5A5F66', '#2E3238'],
  pattern: 'plain',
  lore: 'standard issue. it goes bang.',
};

export interface Loadout {
  item: CrateItem;
  drop?: Drop;
  wear: number;
  seed: number;
}

export function loadoutFor(inventory: Drop[], equipped: string | undefined): Loadout {
  const drop = equipped ? inventory.find((d) => d.uid === equipped) : undefined;
  const item = drop ? findCrateItem(drop.itemId) : undefined;
  if (!drop || !item) return { item: STOCK, wear: 0.02, seed: hashText(STOCK.id) };
  return { item, drop, wear: drop.wear, seed: hashText(drop.uid) };
}

/** Where the hand closes on each weapon, as a fraction of its 30-block length. */
const GRIP_AT: Record<CrateItem['shape'], number> = { pistol: 0.2, smg: 0.3, rifle: 0.4, sniper: 0.4, knife: 0.8, karambit: 0.56 };

/** The weapon as a half-size layer in the avatar's right hand, pointing forward. */
export function heldLayer(l: Loadout, aim = false): Layer {
  const hand = aim ? HAND_AIM : HAND;
  const melee = l.item.shape === 'knife' || l.item.shape === 'karambit';
  const grip = Math.round(GRIP_AT[l.item.shape] * 29);
  const g = melee ? 29 - grip : grip;
  const voxels = weaponVoxels(l.item, l.wear, l.seed).map(([c, y, z, col]) => [z, y, melee ? 29 - c : c, col] as [number, number, number, string]);
  return { voxels, scale: 0.5, offset: [hand.x - 0.5, hand.y - 2, hand.z - g * 0.5] };
}
