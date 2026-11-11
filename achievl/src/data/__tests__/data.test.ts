import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

import { BUILTIN_FOODS, DEFAULT_FOOD_ICON, SCANNED_FOOD_ICON, searchFoods } from '@/data/foods';
import { CATEGORY_INFO, POINT_VALUES, QUEST_CATALOG, QUEST_ICONS, STARTER_TEMPLATE_IDS, templateById } from '@/data/questCatalog';
import { AVATAR_ICONS } from '@/game/engine';
import { MILESTONES } from '@/game/milestones';
import { STAT_INFO } from '@/game/types';

const known = new Set(Object.keys(glyphs));

describe('icons', () => {
  const used: [string, string][] = [
    ...QUEST_CATALOG.map((q): [string, string] => [`quest ${q.id}`, q.icon]),
    ...QUEST_ICONS.map((i): [string, string] => ['quest icon picker', i]),
    ...AVATAR_ICONS.map((i): [string, string] => ['avatar picker', i]),
    ...MILESTONES.map((m): [string, string] => [`milestone ${m.id}`, m.icon]),
    ...BUILTIN_FOODS.map((f): [string, string] => [`food ${f.id}`, f.icon ?? DEFAULT_FOOD_ICON]),
    ...Object.entries(CATEGORY_INFO).map(([k, v]): [string, string] => [`category ${k}`, v.icon]),
    ...Object.entries(STAT_INFO).map(([k, v]): [string, string] => [`stat ${k}`, v.icon]),
    ['default food', DEFAULT_FOOD_ICON],
    ['scanned food', SCANNED_FOOD_ICON],
  ];

  it.each(used)('%s uses a real icon (%s)', (_where, icon) => {
    expect(known.has(icon)).toBe(true);
  });
});

describe('quest catalog', () => {
  it('has unique ids and only allowed point values', () => {
    expect(new Set(QUEST_CATALOG.map((q) => q.id)).size).toBe(QUEST_CATALOG.length);
    for (const q of QUEST_CATALOG) expect(POINT_VALUES).toContain(q.points);
  });

  it('covers every category', () => {
    for (const category of Object.keys(CATEGORY_INFO)) {
      expect(QUEST_CATALOG.some((q) => q.category === category)).toBe(true);
    }
  });

  it('only suggests starter quests that exist', () => {
    for (const id of STARTER_TEMPLATE_IDS) expect(templateById(id)).toBeDefined();
  });
});

describe('milestones', () => {
  it('have unique ids and reachable targets', () => {
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
    for (const m of MILESTONES) {
      expect(m.target).toBeGreaterThan(0);
      expect(m.points).toBeGreaterThan(0);
    }
  });
});

describe('built-in foods', () => {
  it('have unique ids and plausible numbers', () => {
    expect(new Set(BUILTIN_FOODS.map((f) => f.id)).size).toBe(BUILTIN_FOODS.length);
    for (const f of BUILTIN_FOODS) {
      const n = f.nutrients;
      for (const v of Object.values(n)) expect(v).toBeGreaterThanOrEqual(0);
      expect(n.sugar).toBeLessThanOrEqual(n.carbs + 0.01);
      expect(n.fiber).toBeLessThanOrEqual(n.carbs + 0.01);
      expect(n.satFat).toBeLessThanOrEqual(n.fat + 0.01);
      // Calories should roughly match the macros (4/4/9), allowing for alcohol, fibre and rounding.
      const fromMacros = n.protein * 4 + n.carbs * 4 + n.fat * 9;
      if (n.kcal > 20 && f.id !== 'builtin:beer') {
        expect(Math.abs(fromMacros - n.kcal) / n.kcal).toBeLessThan(0.25);
      }
    }
  });

  it('searches by every word, case-insensitively', () => {
    expect(searchFoods(BUILTIN_FOODS, 'CHICKEN grilled').map((f) => f.name)).toEqual([
      'Chicken Breast, grilled',
      'Grilled Chicken Salad',
    ]);
    expect(searchFoods(BUILTIN_FOODS, '   ')).toHaveLength(BUILTIN_FOODS.length);
    expect(searchFoods(BUILTIN_FOODS, 'zzzz')).toHaveLength(0);
  });
});
