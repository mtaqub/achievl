import { Food, Processing } from '@/game/types';

/**
 * Starter food list so logging works offline and without a barcode.
 * Values are typical per-serving figures rounded from public nutrition tables;
 * brands and recipes vary, so treat them as estimates.
 */

type Cat = 'protein' | 'dairy' | 'grain' | 'fruit' | 'veg' | 'fat' | 'snack' | 'drink' | 'meal';

const CAT_ICON: Record<Cat, string> = {
  protein: 'food-drumstick',
  dairy: 'cheese',
  grain: 'bread-slice',
  fruit: 'food-apple',
  veg: 'carrot',
  fat: 'peanut',
  snack: 'cookie',
  drink: 'cup',
  meal: 'silverware-fork-knife',
};

// id, name, serving, category, NOVA group, kcal, protein, carbs, fat, fibre, sugar, sat fat, sodium (mg)
type Row = [string, string, string, Cat, Processing, number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  // Protein
  ['chicken-breast', 'Chicken Breast, grilled', '100 g', 'protein', 1, 165, 31, 0, 3.6, 0, 0, 1, 74],
  ['chicken-thigh', 'Chicken Thigh, roasted', '100 g', 'protein', 1, 209, 26, 0, 10.9, 0, 0, 3, 88],
  ['ground-beef', 'Ground Beef, 90% lean', '100 g cooked', 'protein', 1, 217, 26, 0, 11.8, 0, 0, 4.7, 72],
  ['steak', 'Sirloin Steak, grilled', '100 g', 'protein', 1, 212, 29, 0, 10, 0, 0, 3.9, 60],
  ['salmon', 'Salmon, baked', '100 g', 'protein', 1, 206, 22, 0, 12.4, 0, 0, 2.5, 61],
  ['tuna-can', 'Tuna, canned in water', '1 can (113 g drained)', 'protein', 3, 130, 29, 0, 0.9, 0, 0, 0.3, 380],
  ['shrimp', 'Shrimp, cooked', '100 g', 'protein', 1, 99, 24, 0.2, 0.3, 0, 0, 0.1, 111],
  ['egg', 'Egg, large', '1 egg (50 g)', 'protein', 1, 72, 6.3, 0.4, 4.8, 0, 0.2, 1.6, 71],
  ['egg-whites', 'Egg Whites', '3 whites (99 g)', 'protein', 1, 51, 10.8, 0.7, 0.2, 0, 0.7, 0, 164],
  ['bacon', 'Bacon', '2 slices (16 g cooked)', 'protein', 4, 86, 6, 0.2, 6.6, 0, 0, 2.2, 274],
  ['turkey-deli', 'Turkey Breast, deli', '2 oz (56 g)', 'protein', 4, 62, 9.5, 2.4, 1, 0, 1.2, 0.2, 500],
  ['tofu', 'Tofu, firm', '100 g', 'protein', 3, 144, 17, 3, 9, 2.3, 0, 1.3, 14],
  ['black-beans', 'Black Beans, cooked', '1/2 cup (86 g)', 'protein', 1, 114, 7.6, 20, 0.5, 7.5, 0.3, 0.1, 1],
  ['lentils', 'Lentils, cooked', '1/2 cup (99 g)', 'protein', 1, 115, 9, 20, 0.4, 7.8, 1.8, 0.1, 2],
  ['chickpeas', 'Chickpeas, cooked', '1/2 cup (82 g)', 'protein', 1, 134, 7.3, 22.5, 2.1, 6.2, 3.9, 0.2, 6],
  ['whey', 'Whey Protein Shake', '1 scoop (30 g) in water', 'protein', 4, 120, 24, 3, 1.5, 0, 2, 0.8, 130],

  // Dairy
  ['greek-yogurt', 'Greek Yogurt, plain nonfat', '1 cup (170 g)', 'dairy', 1, 100, 17, 6, 0.7, 0, 5.5, 0.2, 61],
  ['fruit-yogurt', 'Fruit Yogurt, low-fat', '1 cup (170 g)', 'dairy', 4, 170, 7, 32, 2, 0, 26, 1.2, 90],
  ['milk-whole', 'Milk, whole', '1 cup (240 ml)', 'dairy', 1, 149, 7.7, 12, 7.9, 0, 12, 4.6, 105],
  ['milk-skim', 'Milk, skim', '1 cup (240 ml)', 'dairy', 1, 83, 8.3, 12.2, 0.2, 0, 12.2, 0.1, 103],
  ['cheddar', 'Cheddar Cheese', '1 slice (28 g)', 'dairy', 3, 113, 7, 0.4, 9.3, 0, 0.1, 5.3, 180],
  ['cottage-cheese', 'Cottage Cheese, low-fat', '1/2 cup (113 g)', 'dairy', 3, 92, 12.5, 4.9, 2.6, 0, 4.5, 1.5, 348],
  ['mozzarella', 'Mozzarella, part-skim', '1 oz (28 g)', 'dairy', 3, 72, 6.9, 0.8, 4.5, 0, 0.3, 2.9, 175],

  // Grains & starches
  ['oatmeal', 'Oatmeal, cooked', '1 cup (234 g)', 'grain', 1, 166, 5.9, 28, 3.6, 4, 0.6, 0.7, 9],
  ['rice-white', 'White Rice, cooked', '1 cup (158 g)', 'grain', 1, 205, 4.3, 45, 0.4, 0.6, 0.1, 0.1, 2],
  ['rice-brown', 'Brown Rice, cooked', '1 cup (195 g)', 'grain', 1, 216, 5, 45, 1.8, 3.5, 0.7, 0.4, 10],
  ['pasta', 'Pasta, cooked', '1 cup (140 g)', 'grain', 1, 221, 8.1, 43, 1.3, 2.5, 0.8, 0.2, 1],
  ['quinoa', 'Quinoa, cooked', '1 cup (185 g)', 'grain', 1, 222, 8.1, 39, 3.6, 5.2, 1.6, 0.4, 13],
  ['bread-white', 'White Bread', '1 slice (28 g)', 'grain', 3, 75, 2.6, 14, 1, 0.8, 1.5, 0.2, 140],
  ['bread-wheat', 'Whole Wheat Bread', '1 slice (32 g)', 'grain', 3, 81, 4, 13.8, 1.1, 1.9, 1.4, 0.2, 146],
  ['bagel', 'Bagel, plain', '1 bagel (98 g)', 'grain', 3, 270, 10.5, 53, 1.6, 2.3, 5.3, 0.4, 430],
  ['tortilla', 'Flour Tortilla', '1 medium (45 g)', 'grain', 3, 138, 3.7, 23, 3.5, 1.4, 1.2, 1.3, 330],
  ['potato', 'Baked Potato', '1 medium (173 g)', 'grain', 1, 161, 4.3, 37, 0.2, 3.8, 2, 0.1, 17],
  ['sweet-potato', 'Sweet Potato, baked', '1 medium (114 g)', 'grain', 1, 103, 2.3, 24, 0.2, 3.8, 7.4, 0.1, 41],
  ['cereal', 'Sweetened Cereal', '1 cup (39 g)', 'grain', 4, 150, 2, 34, 1.5, 1, 14, 0.3, 190],
  ['granola', 'Granola', '1/2 cup (55 g)', 'grain', 4, 250, 6, 36, 9.5, 4, 13, 1.7, 15],

  // Fruit
  ['apple', 'Apple', '1 medium (182 g)', 'fruit', 1, 95, 0.5, 25, 0.3, 4.4, 19, 0.1, 2],
  ['banana', 'Banana', '1 medium (118 g)', 'fruit', 1, 105, 1.3, 27, 0.4, 3.1, 14.4, 0.1, 1],
  ['orange', 'Orange', '1 medium (131 g)', 'fruit', 1, 62, 1.2, 15.4, 0.2, 3.1, 12.2, 0, 0],
  ['blueberries', 'Blueberries', '1 cup (148 g)', 'fruit', 1, 84, 1.1, 21.4, 0.5, 3.6, 14.7, 0, 1],
  ['strawberries', 'Strawberries', '1 cup (152 g)', 'fruit', 1, 49, 1, 11.7, 0.5, 3, 7.4, 0, 2],
  ['grapes', 'Grapes', '1 cup (151 g)', 'fruit', 1, 104, 1.1, 27.3, 0.2, 1.4, 23.4, 0.1, 3],

  // Vegetables
  ['broccoli', 'Broccoli, steamed', '1 cup (156 g)', 'veg', 1, 55, 3.7, 11.2, 0.6, 5.1, 2.2, 0.1, 64],
  ['spinach', 'Spinach, raw', '2 cups (60 g)', 'veg', 1, 14, 1.7, 2.2, 0.2, 1.3, 0.3, 0, 47],
  ['carrots', 'Carrots, raw', '1 cup (128 g)', 'veg', 1, 52, 1.2, 12.3, 0.3, 3.6, 6.1, 0, 88],
  ['salad', 'Side Salad, no dressing', '1 bowl (100 g)', 'veg', 1, 20, 1.3, 3.9, 0.2, 1.7, 1.9, 0, 15],
  ['bell-pepper', 'Bell Pepper', '1 medium (119 g)', 'veg', 1, 31, 1.2, 7.2, 0.4, 2.5, 5, 0, 5],
  ['tomato', 'Tomato', '1 medium (123 g)', 'veg', 1, 22, 1.1, 4.8, 0.2, 1.5, 3.2, 0, 6],

  // Fats, nuts & spreads
  ['avocado', 'Avocado', '1/2 fruit (100 g)', 'fat', 1, 160, 2, 8.5, 14.7, 6.7, 0.7, 2.1, 7],
  ['almonds', 'Almonds', '1 oz (28 g)', 'fat', 1, 164, 6, 6.1, 14.2, 3.5, 1.2, 1.1, 0],
  ['peanut-butter', 'Peanut Butter', '2 tbsp (32 g)', 'fat', 3, 188, 8, 6, 16, 1.9, 3, 3.3, 136],
  ['olive-oil', 'Olive Oil', '1 tbsp (14 g)', 'fat', 2, 119, 0, 0, 13.5, 0, 0, 1.9, 0],
  ['butter', 'Butter', '1 tbsp (14 g)', 'fat', 2, 102, 0.1, 0, 11.5, 0, 0, 7.3, 91],

  // Snacks & sweets
  ['protein-bar', 'Protein Bar', '1 bar (60 g)', 'snack', 4, 220, 20, 23, 7, 3, 6, 3, 200],
  ['granola-bar', 'Granola Bar', '1 bar (24 g)', 'snack', 4, 100, 1.5, 17, 3, 1, 7, 0.5, 75],
  ['chips', 'Potato Chips', '1 oz (28 g)', 'snack', 4, 152, 2, 15, 9.8, 1.2, 0.1, 1, 148],
  ['popcorn', 'Popcorn, air-popped', '3 cups (24 g)', 'snack', 1, 93, 3.1, 18.7, 1.1, 3.6, 0.2, 0.1, 2],
  ['dark-chocolate', 'Dark Chocolate, 70%', '1 oz (28 g)', 'snack', 3, 170, 2.2, 13, 12, 3.1, 6.8, 6.9, 6],
  ['milk-chocolate', 'Milk Chocolate Bar', '1 bar (43 g)', 'snack', 4, 235, 3.3, 26, 13, 1.5, 22, 8, 35],
  ['cookie', 'Chocolate Chip Cookie', '1 large (40 g)', 'snack', 4, 196, 2, 26, 9.6, 1, 14, 4.5, 125],
  ['donut', 'Glazed Donut', '1 donut (64 g)', 'snack', 4, 269, 3.9, 31, 14.7, 1.1, 15, 6, 320],
  ['ice-cream', 'Ice Cream, vanilla', '1/2 cup (66 g)', 'snack', 4, 137, 2.3, 16, 7.3, 0.5, 14, 4.5, 53],

  // Drinks
  ['coffee', 'Coffee, black', '1 cup (240 ml)', 'drink', 1, 2, 0.3, 0, 0, 0, 0, 0, 5],
  ['latte', 'Latte, whole milk', '12 fl oz (355 ml)', 'drink', 1, 190, 10, 15, 10, 0, 14, 6, 130],
  ['orange-juice', 'Orange Juice', '1 cup (240 ml)', 'drink', 1, 112, 1.7, 26, 0.5, 0.5, 21, 0.1, 2],
  ['cola', 'Cola', '1 can (355 ml)', 'drink', 4, 140, 0, 39, 0, 0, 39, 0, 45],
  ['diet-cola', 'Diet Cola', '1 can (355 ml)', 'drink', 4, 0, 0, 0, 0, 0, 0, 0, 40],
  ['energy-drink', 'Energy Drink', '1 can (250 ml)', 'drink', 4, 110, 1, 28, 0, 0, 27, 0, 105],
  ['sports-drink', 'Sports Drink', '1 bottle (591 ml)', 'drink', 4, 140, 0, 36, 0, 0, 34, 0, 270],
  ['beer', 'Beer', '1 can (355 ml)', 'drink', 3, 153, 1.6, 12.6, 0, 0, 0, 0, 14],
  ['green-tea', 'Green Tea, unsweetened', '1 cup (240 ml)', 'drink', 1, 2, 0.5, 0, 0, 0, 0, 0, 2],

  // Meals
  ['pizza', 'Cheese Pizza', '1 slice (107 g)', 'meal', 4, 285, 12, 36, 10, 2.5, 3.8, 4.8, 640],
  ['cheeseburger', 'Cheeseburger', '1 burger (119 g)', 'meal', 4, 300, 15, 33, 12, 2, 7, 5, 680],
  ['fries', 'French Fries', '1 medium (117 g)', 'meal', 4, 365, 4, 48, 17, 4.4, 0.3, 2.7, 246],
  ['burrito', 'Chicken Burrito', '1 burrito (300 g)', 'meal', 3, 550, 30, 62, 19, 8, 4, 7, 1150],
  ['chicken-salad', 'Grilled Chicken Salad', '1 bowl (300 g)', 'meal', 1, 290, 32, 12, 12, 4, 5, 2.5, 420],
  ['pbj', 'PB&J Sandwich', '1 sandwich', 'meal', 3, 380, 12, 48, 16, 4, 18, 3.5, 420],
  ['instant-ramen', 'Instant Ramen', '1 pack (85 g dry)', 'meal', 4, 380, 8, 52, 14, 2, 2, 7, 1560],
  ['sushi-roll', 'Salmon Sushi Roll', '8 pieces (180 g)', 'meal', 3, 300, 13, 44, 8, 2, 8, 1.5, 550],
  ['chicken-rice', 'Chicken & Rice Bowl', '1 bowl (350 g)', 'meal', 1, 480, 38, 55, 10, 3, 2, 2.5, 520],
  ['mac-cheese', 'Mac & Cheese', '1 cup (200 g)', 'meal', 4, 350, 12, 43, 14, 2, 6, 5, 720],
];

export const BUILTIN_FOODS: Food[] = ROWS.map(
  ([id, name, serving, cat, processing, kcal, protein, carbs, fat, fiber, sugar, satFat, sodiumMg]) => ({
    id: `builtin:${id}`,
    name,
    serving,
    source: 'builtin' as const,
    icon: CAT_ICON[cat],
    processing,
    nutrients: { kcal, protein, carbs, fat, fiber, sugar, satFat, sodiumMg },
  })
);

export const DEFAULT_FOOD_ICON = 'silverware-fork-knife';
export const SCANNED_FOOD_ICON = 'barcode-scan';

/** Case-insensitive search across name and brand; every word must match. */
export function searchFoods(foods: Food[], query: string): Food[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return foods;
  return foods.filter((food) => {
    const hay = `${food.name} ${food.brand ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
