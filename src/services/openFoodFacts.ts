/**
 * Barcode lookups against Open Food Facts, a free, community-maintained product
 * database (https://world.openfoodfacts.org). No account or key is needed.
 */
import { round2 } from '@/game/leveling';
import { Food, Nutrients, Processing } from '@/game/types';

export type LookupResult =
  | { status: 'found'; food: Food }
  /** The product exists but has no usable nutrition facts; the name can prefill a manual entry. */
  | { status: 'no_nutrition'; name: string; brand?: string }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

const FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments,nova_group';
const TIMEOUT_MS = 12_000;

type Nutriments = Record<string, unknown>;

const num = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

function readNutrients(n: Nutriments, basis: 'serving' | '100g'): Nutrients | null {
  const get = (key: string) => num(n[`${key}_${basis}`]);
  let kcal = get('energy-kcal');
  if (kcal === null) {
    const kj = get('energy');
    if (kj !== null) kcal = kj / 4.184;
  }
  const protein = get('proteins');
  const carbs = get('carbohydrates');
  const fat = get('fat');
  if (kcal === null && protein === null && carbs === null && fat === null) return null;

  // Sodium is listed in grams; some entries only carry salt (sodium = salt / 2.5).
  const sodiumG = get('sodium') ?? (get('salt') !== null ? (get('salt') as number) / 2.5 : 0);

  return {
    kcal: Math.round(kcal ?? (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9),
    protein: round2(protein ?? 0),
    carbs: round2(carbs ?? 0),
    fat: round2(fat ?? 0),
    fiber: round2(get('fiber') ?? 0),
    sugar: round2(get('sugars') ?? 0),
    satFat: round2(get('saturated-fat') ?? 0),
    sodiumMg: Math.round(sodiumG * 1000),
  };
}

/** Turns an Open Food Facts response into a food, preferring per-serving figures when present. */
export function parseProduct(payload: unknown, code: string): LookupResult {
  const body = payload as { status?: number; product?: Record<string, unknown> } | null;
  const product = body?.product;
  if (!product || body?.status === 0) return { status: 'not_found' };

  const brand = typeof product.brands === 'string' ? product.brands.split(',')[0].trim() || undefined : undefined;
  const rawName = typeof product.product_name === 'string' ? product.product_name.trim() : '';
  const name = rawName || brand || 'Scanned product';
  const nutriments = (product.nutriments ?? {}) as Nutriments;

  const perServing = num(product.serving_quantity) ? readNutrients(nutriments, 'serving') : null;
  const nutrients = perServing?.kcal ? perServing : readNutrients(nutriments, '100g');
  if (!nutrients) return { status: 'no_nutrition', name, brand };

  const servingLabel = typeof product.serving_size === 'string' && product.serving_size.trim() ? product.serving_size.trim() : null;
  const nova = num(product.nova_group) ?? num(nutriments['nova-group']);

  return {
    status: 'found',
    food: {
      id: `scan:${code}`,
      name: name.slice(0, 80),
      brand,
      serving: perServing?.kcal ? (servingLabel ?? `${product.serving_quantity} g`) : '100 g',
      nutrients,
      barcode: code,
      source: 'scan',
      processing: nova && nova >= 1 && nova <= 4 ? (Math.round(nova) as Processing) : undefined,
    },
  };
}

export async function lookupBarcode(code: string, fetcher: typeof fetch = fetch): Promise<LookupResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
      signal: controller.signal,
      // Open Food Facts asks apps to identify themselves. Browsers ignore this header.
      headers: { 'User-Agent': 'Achievl/0.1 (mobile app)' },
    });
    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) return { status: 'error', message: `The food database answered with an error (${response.status}).` };
    return parseProduct(await response.json(), code);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      status: 'error',
      message: aborted ? 'The lookup timed out. Check your connection and try again.' : 'Could not reach the food database. Check your connection.',
    };
  } finally {
    clearTimeout(timer);
  }
}
