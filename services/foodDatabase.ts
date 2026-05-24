/**
 * OpenFoodFacts + Edamam food database service.
 */
import axios from 'axios';
import { getFoodByBarcodeAI } from './groq';

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
    headers: {
      'User-Agent': 'FitGO - Android/iOS - 1.0.0 - support@fitgo.app',
    },
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
export async function getFoodByBarcode(barcode: string, language: string = 'es'): Promise<FoodItem | null> {
  try {
    const { data } = await axios.get(`${OFF_BASE}/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'FitGO - Android/iOS - 1.0.0 - support@fitgo.app',
      },
      timeout: 8000,
    });

    if (data && data.status === 1 && data.product) {
      const p = data.product;
      const nut = p.nutriments || {};
      const cal = nut['energy-kcal_100g'] ?? (nut['energy_100g'] ? Math.round(nut['energy_100g'] / 4.184) : 0);

      // Try multiple language variations for product name
      const name = p.product_name_es || 
                   p.product_name || 
                   p.product_name_en || 
                   p.generic_name_es || 
                   p.generic_name || 
                   p.product_name_fr || 
                   p.product_name_pt || 
                   p.product_name_de || 
                   p.product_name_it || 
                   p.product_name_ru || 
                   '';

      if (name && name !== 'Unknown product') {
        return {
          id:       barcode,
          name:     name,
          brand:    p.brands || p.brand || p.brands_tags?.[0] || '',
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
    }
  } catch (err) {
    console.error('[OpenFoodFacts] Barcode fetch error:', err);
  }

  // Fallback to Groq AI barcode lookup
  console.log(`[Barcode fallback] OpenFoodFacts lookup failed or returned empty name for barcode: ${barcode}. Attempting Groq AI lookup...`);
  try {
    const aiFood = await getFoodByBarcodeAI(barcode, language);
    if (aiFood) {
      return {
        id:       barcode,
        name:     aiFood.name,
        brand:    aiFood.brand,
        calories: aiFood.calories,
        protein:  aiFood.protein,
        carbs:    aiFood.carbs,
        fat:      aiFood.fat,
        sugar:    aiFood.sugar,
        fiber:    aiFood.fiber,
        sodium:   aiFood.sodium,
        saturatedFat: aiFood.saturatedFat,
        transFat:     aiFood.transFat,
        iron:     aiFood.iron,
        calcium:  aiFood.calcium,
        source:   'custom' as const,
      };
    }
  } catch (err) {
    console.error('[Barcode fallback] Groq AI lookup error:', err);
  }

  return null;
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
      sugar:    Math.round(h.food.nutrients?.SUGAR       ?? 0),
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
  sex: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  lifestyleLevel?: 'seated' | 'standing_sometimes' | 'standing_mostly' | 'moving' | 'physical_work';
}): { bmr: number; tdee: number } {
  // Mifflin-St Jeor
  const bmrMale = 10 * params.weight + 6.25 * params.height - 5 * params.age + 5;
  const bmrFemale = 10 * params.weight + 6.25 * params.height - 5 * params.age - 161;
  const bmr = params.sex === 'male' ? bmrMale : params.sex === 'female' ? bmrFemale : (bmrMale + bmrFemale) / 2;

  // Base multipliers for NEAT (Non-Exercise Activity Thermogenesis)
  const lifestyleMultipliers = {
    seated: 1.15,
    standing_sometimes: 1.25,
    standing_mostly: 1.35,
    moving: 1.45,
    physical_work: 1.55,
  };

  // Additions for EAT (Exercise Activity Thermogenesis)
  const exerciseAdditions = {
    sedentary:   0.05,
    light:       0.15,
    moderate:    0.25,
    active:      0.40,
    very_active: 0.55,
  };

  const lifestyleBase = lifestyleMultipliers[params.lifestyleLevel || 'seated'];
  const exerciseBonus = exerciseAdditions[params.activityLevel];
  const totalMultiplier = lifestyleBase + exerciseBonus;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(bmr * totalMultiplier),
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
