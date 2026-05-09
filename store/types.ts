import type { FoodItem } from '../services/foodDatabase';

export type ThemeMode = 'light' | 'dark';
export type AppLanguage = 'en' | 'es' | 'fr' | 'pt' | 'it' | 'de' | 'ru';

/**
 * Health profile sub-shape stored inside UserProfile.
 * All fields are optional so users can skip any section.
 */
export interface HealthProfile {
  /** Dietary restrictions, e.g. ['vegetarian', 'gluten_free', 'custom: sin pimientos'] */
  dietaryRestrictions?:    string[];
  /** Medical conditions relevant to nutrition, e.g. ['diabetes_type2', 'hypertension'] */
  medicalConditions?:      string[];
  /** Medications and supplements currently taken, e.g. ['creatine', 'omega3'] */
  medicationsSupplements?: string[];
}

export interface UserProfile extends HealthProfile {
  id:              string;
  name:            string;
  email:           string;
  avatarUrl?:      string;
  sex:             'male' | 'female';
  age:             number;
  weight:          number;   // kg
  height:          number;   // cm
  activityLevel:   'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal:            'lose' | 'maintain' | 'gain';
  targetWeight?:   number;
  startingWeight?: number;
  tdee:            number;
  targetCalories:  number;
  macros:          { protein: number; carbs: number; fat: number };
  availableFoods?:  string[];
  preferences?:    string[];
  isPro:           boolean;
  role:            'user' | 'admin' | 'super_admin';
  onboardingDone:  boolean;
  widgetsOrder?:   string[];
  lifestyle?:      'seated' | 'standing_sometimes' | 'standing_mostly' | 'moving' | 'physical_work';
  extraSnacks?:    number;
}

export interface FoodLog {
  id:         string;
  foodItem:   FoodItem;
  grams:      number;
  meal:       string;
  loggedAt:   string;  // ISO date string
  calories:   number;
  protein:    number;
  carbs:      number;
  fat:        number;
  sugar?:     number;
  fiber?:     number;
  sodium?:    number;
  iron?:      number;
  calcium?:   number;
  saturatedFat?: number;
  transFat?:     number;
}

export interface ActivityLog {
  id:         string;
  name:       string;
  icon:       string;
  calories:   number;
  duration:   number;   // minutes
  loggedAt:   string;   // ISO date string
}

export interface DailyProgress {
  date:          string;  // YYYY-MM-DD
  totalCalories: number;
  totalProtein:  number;
  totalCarbs:    number;
  totalFat:      number;
  logs:          FoodLog[];
}

export interface CoachMessage {
  id:        string;
  role:      'user' | 'model';
  content:   string;
  imageUrl?: string;
  timestamp: string;
}

export interface BodyMeasurement {
  id:          string;
  date:        string;   // YYYY-MM-DD
  weight?:     number;   // kg
  bodyFat?:    number;   // %
  waist?:      number;   // cm
  hips?:       number;   // cm
  chest?:      number;   // cm
  arms?:       number;   // cm
  legs?:       number;   // cm
  neck?:       number;   // cm
  notes?:      string;
}

export interface Recipe {
  id:           string;
  name:         string;
  description:  string;
  calories:     number;
  protein:      number;
  carbs:        number;
  fat:          number;
  ingredients:  string[];
  instructions: string[];
  imageUrl?:    string;
  prepTime:     number; // minutes
  goal:         'lose' | 'maintain' | 'gain';
  isFavorite:   boolean;
}

export interface ProgressPhoto {
  id:        string;
  uri:       string;
  date:      string; // YYYY-MM-DD
  notes?:    string;
}
