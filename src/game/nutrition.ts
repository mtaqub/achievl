import { round2 } from './leveling';
import { Food, FoodEntry, Gain, Nutrients, Processing, Stats } from './types';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

export const EMPTY_NUTRIENTS: Nutrients = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  satFat: 0,
  sodiumMg: 0,
};

/**
 * Whole foods get a small bonus and ultra-processed ones a penalty. Scanned products
 * carry their NOVA group from Open Food Facts; built-in foods are tagged by hand.
 */
const PROCESSING_ADJUST: Record<Processing, number> = { 1: 3, 2: 0, 3: -4, 4: -12 };

const GRADE_FLOORS: [Grade, number][] = [
  ['S', 82],
  ['A', 64],
  ['B', 55],
  ['C', 42],
  ['D', 28],
  ['E', 0],
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * 0–100 quality score from nutrient density (amounts per 100 kcal), so the result
 * is the same whatever the serving size. Protein and fibre raise it; free sugar,
 * saturated fat and sodium lower it. Fibre and protein offset sugar so whole fruit
 * and plain dairy are not scored like soda.
 */
export function scoreNutrients(n: Nutrients, processing?: Processing): number {
  const adjust = processing ? PROCESSING_ADJUST[processing] : 0;
  // Water, black coffee, diet drinks: nothing to judge density on.
  if (n.kcal < 5) return clamp(60 + adjust, 0, 100);

  const per100 = 100 / n.kcal;
  const proteinPts = Math.min(22, n.protein * per100 * 4);
  const fiberPts = Math.min(22, n.fiber * per100 * 8);
  const freeSugar = Math.max(0, n.sugar - 3 * n.fiber - 0.5 * n.protein);
  const sugarPen = Math.min(30, Math.max(0, freeSugar * per100 - 4) * 3);
  const satPen = Math.min(20, n.satFat * per100 * 5);
  const sodiumPen = Math.min(15, (n.sodiumMg * per100) / 20);

  return clamp(50 + proteinPts + fiberPts - sugarPen - satPen - sodiumPen + adjust, 0, 100);
}

export function gradeForScore(score: number): Grade {
  for (const [grade, floor] of GRADE_FLOORS) {
    if (score >= floor) return grade;
  }
  return 'E';
}

export const GRADE_BLURB: Record<Grade, string> = {
  S: 'Legendary fuel',
  A: 'Great fuel',
  B: 'Solid fuel',
  C: 'Okay fuel',
  D: 'Weak fuel',
  E: 'Junk drop',
};

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  return {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    carbs: n.carbs * factor,
    fat: n.fat * factor,
    fiber: n.fiber * factor,
    sugar: n.sugar * factor,
    satFat: n.satFat * factor,
    sodiumMg: n.sodiumMg * factor,
  };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
      sugar: acc.sugar + n.sugar,
      satFat: acc.satFat + n.satFat,
      sodiumMg: acc.sodiumMg + n.sodiumMg,
    }),
    { ...EMPTY_NUTRIENTS }
  );
}

const STAT_CAP_PER_ENTRY = 5;

/** Stat points one log entry pays: macros map onto the stats they feed. */
export function statsFromNutrients(n: Nutrients): Partial<Stats> {
  const raw: Partial<Stats> = {
    STR: n.protein / 10,
    VIT: n.fiber / 4,
    AGI: Math.max(0, n.carbs - n.sugar) / 40,
    INT: Math.max(0, n.fat - n.satFat) / 15,
  };
  const out: Partial<Stats> = {};
  for (const [key, value] of Object.entries(raw) as [keyof Stats, number][]) {
    const v = round2(Math.min(STAT_CAP_PER_ENTRY, value));
    if (v >= 0.05) out[key] = v;
  }
  return out;
}

export interface FoodVerdict {
  score: number;
  grade: Grade;
  /** XP for logging it. Honest logging always pays; better fuel pays more. */
  xp: number;
  /** Stat points for the servings given. */
  stats: Partial<Stats>;
  buffs: string[];
  debuffs: string[];
}

export function judgeFood(food: Pick<Food, 'nutrients' | 'processing'>, servings = 1): FoodVerdict {
  const n = food.nutrients;
  const score = Math.round(scoreNutrients(n, food.processing));
  const total = scaleNutrients(n, servings);
  const buffs: string[] = [];
  const debuffs: string[] = [];

  if (n.kcal >= 5 && (n.protein >= 15 || (n.protein * 100) / n.kcal >= 8)) buffs.push('Protein Boost');
  if (n.fiber >= 4) buffs.push('Fibre Shield');
  if (n.kcal < 5) buffs.push('Zero Cal');
  if (n.sugar - 3 * n.fiber - 0.5 * n.protein >= 15) debuffs.push('Sugar Rush');
  if (n.sodiumMg >= 600) debuffs.push('Salt Bomb');
  if (n.satFat >= 6) debuffs.push('Heavy');

  return {
    score,
    grade: gradeForScore(score),
    xp: 3 + Math.round(score / 10),
    stats: statsFromNutrients(total),
    buffs,
    debuffs,
  };
}

export function foodGain(food: Food, servings: number): Gain {
  const verdict = judgeFood(food, servings);
  return { xp: verdict.xp, stats: verdict.stats };
}

export function entryNutrients(entry: FoodEntry): Nutrients {
  return scaleNutrients(entry.food.nutrients, entry.servings);
}

export function dayNutrients(entries: FoodEntry[]): Nutrients {
  return sumNutrients(entries.map(entryNutrients));
}

/** Calorie-weighted average score for a day's food, or null if nothing has calories. */
export function dayFoodScore(entries: FoodEntry[]): number | null {
  let weight = 0;
  let total = 0;
  for (const entry of entries) {
    const kcal = entry.food.nutrients.kcal * entry.servings;
    if (kcal <= 0) continue;
    total += scoreNutrients(entry.food.nutrients, entry.food.processing) * kcal;
    weight += kcal;
  }
  return weight > 0 ? Math.round(total / weight) : null;
}

/**
 * Water pays 1 XP and 0.1 VIT per 100 ml, but only up to the daily goal —
 * drinking past it is fine, it just stops paying.
 */
export function waterGain(ml: number, alreadyMl: number, goalMl: number): Gain {
  const counted = clamp(goalMl - alreadyMl, 0, ml);
  const xp = Math.round(counted / 100);
  const vit = round2(counted / 1000);
  return { xp, stats: vit > 0 ? { VIT: vit } : {} };
}

export const ML_PER_FL_OZ = 29.5735;

export function formatVolume(ml: number, units: 'metric' | 'us'): string {
  if (units === 'us') return `${Math.round(ml / ML_PER_FL_OZ)} fl oz`;
  return ml >= 1000 ? `${round2(ml / 1000)} L` : `${Math.round(ml)} ml`;
}

/**
 * Checks a typed-in product code: UPC-A (12), EAN-13, EAN-8 or GTIN-14 with a valid
 * check digit. Eight-digit UPC-E codes are accepted on length alone, because their
 * check digit belongs to the expanded 12-digit form.
 */
export function isValidBarcode(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  if (![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop() as number;
  // Weights alternate 3,1 starting from the digit next to the check digit.
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  if ((10 - (sum % 10)) % 10 === check) return true;
  return code.length === 8 && (code[0] === '0' || code[0] === '1');
}
