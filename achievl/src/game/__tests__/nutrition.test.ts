import { BUILTIN_FOODS } from '@/data/foods';
import {
  dayFoodScore,
  formatVolume,
  gradeForScore,
  isValidBarcode,
  judgeFood,
  scoreNutrients,
  waterGain,
} from '../nutrition';
import { Food, FoodEntry } from '../types';

const food = (id: string): Food => {
  const found = BUILTIN_FOODS.find((f) => f.id === `builtin:${id}`);
  if (!found) throw new Error(`missing food ${id}`);
  return found;
};
const score = (id: string) => judgeFood(food(id)).score;
const grade = (id: string) => judgeFood(food(id)).grade;

describe('food scoring', () => {
  it('ranks whole foods above junk', () => {
    expect(score('broccoli')).toBeGreaterThan(score('chicken-breast'));
    expect(score('chicken-breast')).toBeGreaterThan(score('pizza'));
    expect(score('pizza')).toBeGreaterThan(score('cola'));
  });

  it('gives sensible grades to staples', () => {
    expect(grade('broccoli')).toBe('S');
    expect(grade('lentils')).toBe('S');
    expect(grade('chicken-breast')).toBe('A');
    expect(grade('salmon')).toBe('A');
    expect(grade('apple')).toBe('A');
    expect(grade('greek-yogurt')).toBe('A');
    expect(grade('cola')).toBe('E');
    expect(grade('ice-cream')).toBe('E');
  });

  it('does not treat fruit or plain dairy like soda', () => {
    expect(score('banana')).toBeGreaterThan(score('cola') + 40);
    expect(score('greek-yogurt')).toBeGreaterThan(score('fruit-yogurt') + 20);
  });

  it('keeps every built-in food out of the top grade if it is ultra-processed', () => {
    for (const f of BUILTIN_FOODS.filter((x) => x.processing === 4)) {
      expect(['S']).not.toContain(judgeFood(f).grade);
    }
  });

  it('scores the same food the same at any serving size', () => {
    const base = food('oatmeal');
    const doubled = { ...base, nutrients: Object.fromEntries(Object.entries(base.nutrients).map(([k, v]) => [k, v * 2])) as Food['nutrients'] };
    expect(scoreNutrients(doubled.nutrients, doubled.processing)).toBeCloseTo(scoreNutrients(base.nutrients, base.processing), 6);
  });

  it('handles zero-calorie drinks without dividing by zero', () => {
    const verdict = judgeFood(food('diet-cola'));
    expect(Number.isFinite(verdict.score)).toBe(true);
    expect(verdict.buffs).toContain('Zero Cal');
  });

  it('maps score bands to grades', () => {
    expect(gradeForScore(100)).toBe('S');
    expect(gradeForScore(82)).toBe('S');
    expect(gradeForScore(81.9)).toBe('A');
    expect(gradeForScore(55)).toBe('B');
    expect(gradeForScore(42)).toBe('C');
    expect(gradeForScore(28)).toBe('D');
    expect(gradeForScore(0)).toBe('E');
  });

  it('pays stats from macros and scales them with servings', () => {
    const one = judgeFood(food('chicken-breast'), 1);
    const two = judgeFood(food('chicken-breast'), 2);
    expect(one.stats.STR).toBeCloseTo(3.1, 2);
    expect(two.stats.STR).toBe(5); // capped per entry
    expect(two.xp).toBe(one.xp); // XP rewards logging, not eating more
    expect(one.buffs).toContain('Protein Boost');
  });

  it('flags debuffs', () => {
    expect(judgeFood(food('cola')).debuffs).toContain('Sugar Rush');
    expect(judgeFood(food('instant-ramen')).debuffs).toEqual(expect.arrayContaining(['Salt Bomb', 'Heavy']));
  });

  it('always pays something for honest logging', () => {
    for (const f of BUILTIN_FOODS) {
      const verdict = judgeFood(f);
      expect(verdict.xp).toBeGreaterThanOrEqual(3);
      expect(verdict.xp).toBeLessThanOrEqual(13);
    }
  });

  it('averages a day by calories', () => {
    const entry = (id: string, servings: number): FoodEntry => ({
      id,
      food: food(id),
      servings,
      meal: 'lunch',
      at: 0,
      gain: { xp: 0, stats: {} },
    });
    expect(dayFoodScore([])).toBeNull();
    const mixed = dayFoodScore([entry('broccoli', 1), entry('cola', 2)]) as number;
    expect(mixed).toBeGreaterThan(score('cola'));
    expect(mixed).toBeLessThan((score('broccoli') + score('cola')) / 2); // cola has more calories
  });
});

describe('water', () => {
  it('pays 1 XP per 100 ml up to the goal', () => {
    expect(waterGain(250, 0, 2000)).toEqual({ xp: 3, stats: { VIT: 0.25 } });
    expect(waterGain(500, 1800, 2000)).toEqual({ xp: 2, stats: { VIT: 0.2 } });
    expect(waterGain(500, 2000, 2000)).toEqual({ xp: 0, stats: {} });
  });

  it('formats volumes in both unit systems', () => {
    expect(formatVolume(250, 'metric')).toBe('250 ml');
    expect(formatVolume(1500, 'metric')).toBe('1.5 L');
    expect(formatVolume(355, 'us')).toBe('12 fl oz');
  });
});

describe('barcodes', () => {
  it('accepts valid UPC-A, EAN-13 and EAN-8 codes', () => {
    expect(isValidBarcode('737628064502')).toBe(true); // UPC-A
    expect(isValidBarcode('0737628064502')).toBe(true); // same product as EAN-13
    expect(isValidBarcode('3017620422003')).toBe(true); // EAN-13
    expect(isValidBarcode('96385074')).toBe(true); // EAN-8
  });

  it('rejects bad check digits, wrong lengths and non-digits', () => {
    expect(isValidBarcode('737628064503')).toBe(false);
    expect(isValidBarcode('12345')).toBe(false);
    expect(isValidBarcode('73762806450a')).toBe(false);
    expect(isValidBarcode('')).toBe(false);
  });
});
