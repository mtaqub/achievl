import { ArcadeData } from './types';

export interface Product {
  /** Identifier to register with the App Store and Google Play. */
  id: string;
  kind: 'subscription' | 'consumable';
  name: string;
  blurb: string;
  icon: string;
  grants?: { keys?: number; boxes?: number };
}

export const PLUS_ID = 'achievl_plus_monthly';

/** What Achievl Plus unlocks. Each perk is checked against `ArcadeData.plus` where it is used. */
export const PLUS_PERKS: { icon: string; title: string; blurb: string }[] = [
  { icon: 'key-plus', title: 'daily key', blurb: 'one free crate key every day.' },
  { icon: 'diamond-stone', title: 'prism crate', blurb: 'a third crate with pearl, chrome and rainbow finishes.' },
  { icon: 'fast-forward', title: 'quick open', blurb: 'skip the reel when you just want the result.' },
  { icon: 'star-four-points', title: 'plus badge', blurb: 'a badge on your player card.' },
];

export const PRODUCTS: Product[] = [
  { id: PLUS_ID, kind: 'subscription', name: 'achievl plus', blurb: 'daily key, prism crate, quick open and a plus badge.', icon: 'star-four-points' },
  { id: 'achievl_keys_5', kind: 'consumable', name: '5 keys', blurb: 'five crate keys.', icon: 'key-variant', grants: { keys: 5 } },
  { id: 'achievl_keys_25', kind: 'consumable', name: '25 keys', blurb: 'twenty-five crate keys.', icon: 'key-chain-variant', grants: { keys: 25 } },
  { id: 'achievl_boxes_3', kind: 'consumable', name: '3 loot boxes', blurb: 'three loot boxes.', icon: 'gift', grants: { boxes: 3 } },
  { id: 'achievl_boxes_11', kind: 'consumable', name: '11 loot boxes', blurb: 'eleven loot boxes.', icon: 'gift-open', grants: { boxes: 11 } },
];

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Applies a completed purchase. Called only after the store confirms it. */
export function grantProduct(data: ArcadeData, productId: string): ArcadeData {
  const product = productById(productId);
  if (!product) return data;
  if (product.kind === 'subscription') return { ...data, plus: true };
  return {
    ...data,
    bonusKeys: data.bonusKeys + (product.grants?.keys ?? 0),
    bonusBoxes: data.bonusBoxes + (product.grants?.boxes ?? 0),
  };
}
