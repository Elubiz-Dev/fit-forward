/**
 * OpenFoodFacts + Edamam food database service.
 */
import axios from 'axios';

const OFF_BASE = 'https://world.openfoodfacts.org';
const EDAMAM_APP_ID  = process.env.EXPO_PUBLIC_EDAMAM_APP_ID  ?? '';
const EDAMAM_APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY ?? '';

export interface FoodItem {
  id:       string;
  name:     string;
  brand?:   string;
  calories: number;  // per 100g
  protein:  number;
  carbs:    number;
  fat:      number;
  saturatedFat?: number;
  transFat?:     number;
  sugar?:   number;
  fiber?:   number;
  sodium?:  number;
  iron?:    number;
  calcium?: number;
  imageUrl?: string;
  source:   'openfoodfacts' | 'edamam' | 'custom';
}

// ─── OpenFoodFacts ─────────────────────────────────────────────────────────────
export async function searchFoodOFF(query: string, page = 1): Promise<FoodItem[]> {
  const { data } = await axios.get(`${OFF_BASE}/cgi/search.pl`, {
    params: {
      search_terms: query,
      search_simple: 1,
      action: 'process',
      json: 1,
      page_size: 20,
      page,
      fields: 'id,product_name,brands,nutriments,image_front_small_url',
      lc: 'es',
      categories_lc: 'es'
    },
    timeout: 8000,
  });

  return (data.products ?? [])
    .filter((p: any) => p.product_name && p.nutriments)
    .map((p: any) => {
      const nut = p.nutriments || {};
      const cal = nut['energy-kcal_100g'] ?? (nut['energy_100g'] ? Math.round(nut['energy_100g'] / 4.184) : 0);
      return {
        id:       p.id ?? p.code,
        name:     p.product_name,
        brand:    p.brands,
        calories: Math.round(cal),
        protein:  Math.round(nut['proteins_100g']    ?? 0),
        carbs:    Math.round(nut['carbohydrates_100g'] ?? 0),
        fat:      Math.round(nut['fat_100g']          ?? 0),
        saturatedFat: Math.round(nut['saturated-fat_100g'] ?? 0),
        transFat:     Math.round(nut['trans-fat_100g']     ?? 0),
        fiber:    Math.round(nut['fiber_100g']        ?? 0),
        sugar:    Math.round(nut['sugars_100g']       ?? 0),
        sodium:   Math.round((nut['sodium_100g'] ?? 0) * 1000),
        iron:     Math.round((nut['iron_100g'] ?? 0) * 1000),
        calcium:  Math.round((nut['calcium_100g'] ?? 0) * 1000),
        imageUrl: p.image_front_small_url,
        source:   'openfoodfacts' as const,
      };
    });
}

// ─── OpenFoodFacts barcode lookup ──────────────────────────────────────────────
export async function getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
  const { data } = await axios.get(`${OFF_BASE}/api/v0/product/${barcode}.json`, {
    timeout: 8000,
  });

  if (data.status !== 1 || !data.product) return null;
  const p = data.product;

  const nut = p.nutriments || {};
  const cal = nut['energy-kcal_100g'] ?? (nut['energy_100g'] ? Math.round(nut['energy_100g'] / 4.184) : 0);

  return {
    id:       barcode,
    name:     p.product_name ?? 'Unknown product',
    brand:    p.brands,
    calories: Math.round(cal),
    protein:  Math.round(nut['proteins_100g']    ?? 0),
    carbs:    Math.round(nut['carbohydrates_100g'] ?? 0),
    fat:      Math.round(nut['fat_100g']          ?? 0),
    saturatedFat: Math.round(nut['saturated-fat_100g'] ?? 0),
    transFat:     Math.round(nut['trans-fat_100g']     ?? 0),
    sugar:    Math.round(nut['sugars_100g']        ?? 0),
    fiber:    Math.round(nut['fiber_100g']         ?? 0),
    sodium:   Math.round((nut['sodium_100g']       ?? 0) * 1000),
    iron:     Math.round((nut['iron_100g']       ?? 0) * 1000),
    calcium:  Math.round((nut['calcium_100g']    ?? 0) * 1000),
    imageUrl: p.image_front_small_url,
    source:   'openfoodfacts' as const,
  };
}

// ─── Edamam search (fallback / enrichment) ─────────────────────────────────────
export async function searchFoodEdamam(query: string): Promise<FoodItem[]> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) return [];
  try {
    const { data } = await axios.get('https://api.edamam.com/api/food-database/v2/parser', {
      params: {
        app_id:  EDAMAM_APP_ID,
        app_key: EDAMAM_APP_KEY,
        ingr:    query,
        'nutrition-type': 'cooking',
      },
      timeout: 8000,
    });

    return (data.hints ?? []).slice(0, 15).map((h: any) => ({
      id:       h.food.foodId,
      name:     h.food.label,
      brand:    h.food.brand,
      calories: Math.round(h.food.nutrients?.ENERC_KCAL ?? 0),
      protein:  Math.round(h.food.nutrients?.PROCNT      ?? 0),
      carbs:    Math.round(h.food.nutrients?.CHOCDF      ?? 0),
      fat:      Math.round(h.food.nutrients?.FAT         ?? 0),
      fiber:    Math.round(h.food.nutrients?.FIBTG       ?? 0),
      iron:     Math.round(h.food.nutrients?.FE          ?? 0),
      calcium:  Math.round(h.food.nutrients?.CA          ?? 0),
      imageUrl: h.food.image,
      source:   'edamam' as const,
    }));
  } catch {
    return [];
  }
}

// ─── Combined search ───────────────────────────────────────────────────────────
export async function searchFood(query: string): Promise<FoodItem[]> {
  const [off, edamam] = await Promise.allSettled([
    searchFoodOFF(query),
    searchFoodEdamam(query),
  ]);

  const offResults    = off.status    === 'fulfilled' ? off.value    : [];
  const edamamResults = edamam.status === 'fulfilled' ? edamam.value : [];

  // Deduplicate by name (simple)
  const seen = new Set<string>();
  return [...offResults, ...edamamResults].filter(f => {
    const key = f.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── TDEE calculator ───────────────────────────────────────────────────────────
export function calculateTDEE(params: {
  weight: number;    // kg
  height: number;    // cm
  age: number;
  sex: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}): { bmr: number; tdee: number } {
  // Mifflin-St Jeor
  const bmr = params.sex === 'male'
    ? 10 * params.weight + 6.25 * params.height - 5 * params.age + 5
    : 10 * params.weight + 6.25 * params.height - 5 * params.age - 161;

  const activityMultipliers = {
    sedentary:   1.2,
    light:       1.375,
    moderate:    1.55,
    active:      1.725,
    very_active: 1.9,
  };

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(bmr * activityMultipliers[params.activityLevel]),
  };
}

export function calculateMacros(calories: number, goal: 'lose' | 'maintain' | 'gain'): {
  protein: number; carbs: number; fat: number; targetCalories: number;
} {
  const adjustedCalories = goal === 'lose'
    ? calories - 500
    : goal === 'gain'
    ? calories + 300
    : calories;

  return {
    targetCalories: Math.round(adjustedCalories),
    protein: Math.round((adjustedCalories * 0.30) / 4),  // 30% protein
    carbs:   Math.round((adjustedCalories * 0.40) / 4),  // 40% carbs
    fat:     Math.round((adjustedCalories * 0.30) / 9),  // 30% fat
  };
}
