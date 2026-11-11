import { judgeFood } from '@/game/nutrition';

import { lookupBarcode, parseProduct } from '../openFoodFacts';
import missing from './fixtures/off-missing.json';
import noodles from './fixtures/off-noodles.json';
import spread from './fixtures/off-spread.json';

// The fixtures are real responses from the public API, trimmed to the fields the app reads.

describe('parseProduct', () => {
  it('uses per-serving figures when the product has a serving size', () => {
    const result = parseProduct(noodles, '737628064502');
    expect(result).toEqual({
      status: 'found',
      food: {
        id: 'scan:737628064502',
        name: 'Thai peanut noodle kit includes stir-fry rice noodles & thai peanut seasoning',
        brand: 'Simply Asia',
        serving: '0.333 PACKAGE (52 g)',
        nutrients: { kcal: 200, protein: 5, carbs: 37, fat: 4, fiber: 0.99, sugar: 7, satFat: 1, sodiumMg: 150 },
        barcode: '737628064502',
        source: 'scan',
        processing: 4,
      },
    });
  });

  it('falls back to per-100 g figures', () => {
    const result = parseProduct(spread, '3017620422003');
    if (result.status !== 'found') throw new Error('expected a product');
    expect(result.food).toMatchObject({
      name: 'Nutella',
      brand: 'Ferrero',
      serving: '100 g',
      processing: 3,
      nutrients: { kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9, sugar: 56.3, satFat: 10.6, sodiumMg: 43 },
    });
    expect(judgeFood(result.food).grade).toBe('E');
  });

  it('reports unknown codes', () => {
    expect(parseProduct(missing, '0000000000000')).toEqual({ status: 'not_found' });
    expect(parseProduct(null, '1')).toEqual({ status: 'not_found' });
  });

  it('reports products without nutrition facts so they can be entered by hand', () => {
    const bare = { status: 1, product: { product_name: 'Mystery Sauce', brands: 'Acme, Other', nutriments: {} } };
    expect(parseProduct(bare, '123')).toEqual({ status: 'no_nutrition', name: 'Mystery Sauce', brand: 'Acme' });
  });

  it('derives sodium from salt and calories from kilojoules or macros', () => {
    const salty = {
      status: 1,
      product: { product_name: 'Crackers', nutriments: { energy_100g: 1800, proteins_100g: 10, carbohydrates_100g: 70, fat_100g: 12, salt_100g: 1.5 } },
    };
    const parsed = parseProduct(salty, '1');
    if (parsed.status !== 'found') throw new Error('expected a product');
    expect(parsed.food.nutrients.kcal).toBe(430);
    expect(parsed.food.nutrients.sodiumMg).toBe(600);

    const macrosOnly = { status: 1, product: { product_name: 'Bar', nutriments: { proteins_100g: 20, carbohydrates_100g: 40, fat_100g: 10 } } };
    const bar = parseProduct(macrosOnly, '2');
    if (bar.status !== 'found') throw new Error('expected a product');
    expect(bar.food.nutrients.kcal).toBe(330);
  });

  it('ignores junk numbers', () => {
    const junk = {
      status: 1,
      product: { product_name: 'Odd', nutriments: { 'energy-kcal_100g': 'abc', proteins_100g: -4, carbohydrates_100g: '12.5', fat_100g: null } },
    };
    const parsed = parseProduct(junk, '3');
    if (parsed.status !== 'found') throw new Error('expected a product');
    expect(parsed.food.nutrients).toMatchObject({ protein: 0, carbs: 12.5, fat: 0, kcal: 50 });
  });
});

describe('lookupBarcode', () => {
  const respond = (status: number, body: unknown) =>
    jest.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })) as unknown as typeof fetch;

  it('asks for the product by code and parses the answer', async () => {
    const fetcher = respond(200, noodles);
    const result = await lookupBarcode('737628064502', fetcher);
    expect(result.status).toBe('found');
    expect((fetcher as unknown as jest.Mock).mock.calls[0][0]).toContain('/api/v2/product/737628064502.json');
  });

  it('maps a 404 to not found and other failures to an error', async () => {
    expect(await lookupBarcode('1', respond(404, {}))).toEqual({ status: 'not_found' });
    expect((await lookupBarcode('1', respond(503, {}))).status).toBe('error');
  });

  it('reports network failures without throwing', async () => {
    const offline = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    expect(await lookupBarcode('1', offline)).toEqual({ status: 'error', message: 'Could not reach the food database. Check your connection.' });
  });
});
