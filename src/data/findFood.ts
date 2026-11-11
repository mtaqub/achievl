import { Food } from '@/game/types';

import { BUILTIN_FOODS } from './foods';

/** Looks a food up by id across the built-in list and the player's own foods. */
export function findFood(id: string | undefined, myFoods: Food[]): Food | undefined {
  if (!id) return undefined;
  return myFoods.find((f) => f.id === id) ?? BUILTIN_FOODS.find((f) => f.id === id);
}

/** A UPC-A code read as EAN-13 gains a leading zero; drop it so both forms match. */
export function normalizeBarcode(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 13 && digits.startsWith('0') ? digits.slice(1) : digits;
}

export function findByBarcode(code: string, myFoods: Food[]): Food | undefined {
  return myFoods.find((f) => f.barcode && normalizeBarcode(f.barcode) === code);
}
