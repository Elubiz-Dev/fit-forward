/**
 * AI service for FitGO — powered by Groq (using native fetch for React Native compatibility).
 * Maintains the same exported API as the previous service so the
 * rest of the app requires zero changes.
 *
 * Exported functions:
 *  - buildCoachSystemPrompt     — Builds system prompt for the AI coach
 *  - sendCoachMessage          — Sends a message to the AI coach
 *  - analyzeFoodPhoto          — Analyzes food photos via vision model
 *  - generateMealPlan          — Generates a 7-day personalized meal plan
 *  - generateWorkoutPlan       — Generates a 7-day personalized workout plan
 *  - generateWeeklyAnalysis    — Generates a weekly nutrition review
 *  - transcribeAudio           — Transcribes audio using Whisper
 *  - generateRecipes           — Generates AI personalized recipes
 *  - parseVoiceLog             — Parses natural language food descriptions
 *  - estimateActivityCalories  — Estimates calories burned for an activity
 *  - generateShoppingList      — Generates an HTML shopping list from meal plan
 *  - generateSocialChallenge   — Generates a fun fitness challenge for social
 *  - analyzePhysiquePhoto      — Analyzes body physique photos for progress evaluation
 */

import { supabase } from './supabase';

// ─── Shared language map ──────────────────────────────────────────────────────
/** Maps language codes to full language names used in AI prompts. */
const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French',
  pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
};

/** Resolves a language code to a full name, defaulting to English. */
const getLang = (code: string) => LANG_NAMES[code] || 'English';

// ─── Model IDs ────────────────────────────────────────────────────────────────
const CHAT_MODEL   = 'llama-3.3-70b-versatile'; //no cambiar en proximos
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // No cambiar en proximos!!
const AUDIO_MODEL  = 'whisper-large-v3';

/**
 * Proxies AI requests through a Supabase Edge Function to keep the Groq API key server-side.
 * @param payload — The request body to forward to the Groq API.
 * @returns The parsed JSON response from Groq.
 * @throws Error with a descriptive message if the proxy or Groq returns an error.
 */

// Helper to use Supabase Edge Function as a proxy
async function fetchGroq(payload: any) {
  const { data, error } = await supabase.functions.invoke('groq-proxy', {
    body: payload,
  });

  if (error) {
    console.error('[Groq Proxy Error]:', error);
    
    let errorMsg = error.message || 'Unknown error';
    
    // FunctionsHttpError contains the actual response in the context property
    if (error && typeof error === 'object' && 'context' in error) {
      const context = (error as any).context;
      try {
        // Try to read the response body if possible
        // Note: supabase-js usually already handles this, but let's be safe
        if (context instanceof Response) {
          const body = await context.json();
          if (body && body.error) {
            errorMsg = body.error.message || JSON.stringify(body.error);
          }
        }
      } catch (e) {
        // ignore parsing errors
      }

      if (context.status === 400 && errorMsg === 'Unknown error') {
        errorMsg = 'Bad Request (400) - Check model availability or parameters.';
      }
    }

    throw new Error(`AI Service Error: ${errorMsg}`);
  }

  return data;
}

// ─── Coach system prompt ──────────────────────────────────────────────────────
export function buildCoachSystemPrompt(userProfile: {
  name: string;
  goal: string;
  tdee: number;
  targetCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  availableFoods?: string[];
  age?: number;
  weight?: number;
  height?: number;
  sex?: 'male' | 'female';
  activityLevel?: string;
  dietaryRestrictions?: string[];
  medicalConditions?: string[];
  medicationsSupplements?: string[];
  preferences?: string[];
  mealPlans?: Record<string, any[]>;
  workoutPlans?: Record<string, any>;
}, language: string = 'en', coachType: 'nutritionist' | 'trainer' | 'doctor' = 'nutritionist') {
  const targetLang = getLang(language);

  const allProfileData = `
User profile:
- Name: ${userProfile.name}
- Age: ${userProfile.age ?? 'Unknown'}, Sex: ${userProfile.sex ?? 'Unknown'}, Weight: ${userProfile.weight ?? 'Unknown'}kg, Height: ${userProfile.height ?? 'Unknown'}cm
- Activity Level: ${userProfile.activityLevel ?? 'Unknown'}
- Goal: ${userProfile.goal}

Nutrition Profile:
- TDEE: ${userProfile.tdee} kcal/day
- Daily calorie target: ${userProfile.targetCalories} kcal
- Macro targets: ${userProfile.macros.protein}g protein, ${userProfile.macros.carbs}g carbs, ${userProfile.macros.fat}g fat
${userProfile.availableFoods?.length ? `- Available Foods: ${userProfile.availableFoods.join(', ')}` : ''}

Health Profile (CRITICAL):
- Medical Conditions: ${userProfile.medicalConditions?.length && !userProfile.medicalConditions.includes('none') ? userProfile.medicalConditions.join(', ') : 'None reported'}
- Medications/Supplements: ${userProfile.medicationsSupplements?.length && !userProfile.medicationsSupplements.includes('none') ? userProfile.medicationsSupplements.join(', ') : 'None reported'}
- Dietary Restrictions: ${userProfile.dietaryRestrictions?.length && !userProfile.dietaryRestrictions.includes('none') ? userProfile.dietaryRestrictions.join(', ') : 'None reported'}
- Diet Type Preference: ${userProfile.preferences?.[0] ?? 'Balanced'}
- Note on Anabolics: If the user mentions anabolic substances in their medications (e.g., "anabolics:testosterone"), you MUST provide specific safety advice while maintaining a professional and non-judgmental tone.

${userProfile.mealPlans && Object.keys(userProfile.mealPlans).length > 0 ? `Current Weekly Meal Plan:\n${JSON.stringify(userProfile.mealPlans)}` : ''}
${userProfile.workoutPlans && Object.keys(userProfile.workoutPlans).length > 0 ? `Current Weekly Workout Plan:\n${JSON.stringify(userProfile.workoutPlans)}` : ''}`;

  const roles: Record<string, Record<string, string>> = {
    trainer: {
      en: 'personal trainer', es: 'entrenador personal', fr: 'entraîneur personnel',
      pt: 'treinador pessoal', it: 'personal trainer', de: 'Personal Trainer', ru: 'персональный тренер'
    },
    nutritionist: {
      en: 'nutritionist', es: 'nutricionista', fr: 'nutritionniste',
      pt: 'nutricionista', it: 'nutrizionista', de: 'Ernährungsberater', ru: 'диетолог'
    },
    doctor: {
      en: 'personal doctor', es: 'médico personal', fr: 'médecin personnel',
      pt: 'médico pessoal', it: 'medico personale', de: 'Leibarzt', ru: 'личный врач'
    }
  };

  const role = roles[coachType]?.[language] || roles[coachType]?.['en'] || 'coach';

  return `You are Fitz, an expert AI ${role} inside the FitGO app.
IMPORTANT: You MUST respond in ${targetLang}. You should also understand and process all user inputs in ${targetLang} or English.

${allProfileData}

Guidelines:
1. Act as a professional ${role}. Provide helpful, specific, and evidence-based responses. Cover all questions honestly, including those about medications, supplements, or complex medical situations — always prioritizing accurate, actionable advice.
2. If the user asks about potentially risky topics (anabolic steroids, extreme weight loss, ignoring medical conditions), answer the question completely while including this mandatory disclaimer: "⚠️ ADVERTENCIA: Esta información se proporciona únicamente con fines informativos. El uso de sustancias de riesgo o ignorar condiciones médicas puede conllevar consecuencias graves para la salud."
3. Provide the most accurate advice possible using the profile data. Reference meal or workout plans if mentioned. Keep responses concise and practical (under 250 words).
4. Use relevant emojis in a balanced and professional way to make the response engaging, but do not overdo it. Use them to highlight key points or categories (e.g., 🥦 for food, 💪 for exercise), but keep the text clean and readable.`;
}

// ─── Send coach message ───────────────────────────────────────────────────────
export async function sendCoachMessage(
  history: { role: 'user' | 'model'; parts: any[] }[],
  userMessage: string,
  systemPrompt: string,
  base64Image?: string
): Promise<string> {
  // Convert history → OpenAI-style messages
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((turn) => ({
      role: turn.role === 'model' ? 'assistant' : 'user',
      content: turn.parts.map((p: any) => p.text ?? '').join(''),
    })),
  ];

  // Current user message — with optional image
  if (base64Image) {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage || 'Analyze this image.' },
        {
          type: 'image_url',
          image_url: { 
            url: `data:image/jpeg;base64,${cleanBase64}`,
            detail: 'low'
          },
        },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const data = await fetchGroq({
    model: base64Image ? VISION_MODEL : CHAT_MODEL,
    messages,
    max_tokens: 600,
    temperature: 0.7,
  });

  return data.choices[0]?.message?.content ?? '';
}

// ─── Food photo analysis ───────────────────────────────────────────────────────
export async function analyzeFoodPhoto(base64Image: string, language: string = 'en'): Promise<{
  foods: { 
    name: string; grams: number; calories: number; protein: number; carbs: number; fat: number;
    sugar?: number; fiber?: number; sodium?: number; iron?: number; calcium?: number; saturatedFat?: number; transFat?: number;
  }[];
  totalCalories: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}> {
  if (!base64Image) {
    throw new Error('Image data is missing or empty.');
  }

  const targetLang = getLang(language);
  const exampleName = targetLang === 'Spanish' ? 'Ensalada de pollo' : 'Chicken salad';

  const prompt = `Analyze this food image and return ONLY a JSON object with this structure: {"foods": [{"name": "${exampleName}", "grams": 150, "calories": 250, "protein": 20, "carbs": 30, "fat": 8, "sugar": 5, "fiber": 3, "sodium": 300, "iron": 1.2, "calcium": 150, "saturatedFat": 2, "transFat": 0}], "totalCalories": 250, "confidence": "high", "notes": ""}. Important: Use ${targetLang} for names and notes.`;

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
    
    const data = await fetchGroq({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `You are a nutrition expert that analyzes food images and returns data in JSON format.\n\n${prompt}` },
            {
              type: 'image_url',
              image_url: { 
                url: `data:image/jpeg;base64,${cleanBase64}`,
                detail: 'low'
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    });

    let text = (data.choices[0]?.message?.content ?? '').trim();
    
    // Robust JSON extraction (find first { and last })
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      text = text.slice(startIndex, endIndex + 1);
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('[Groq] Analyze food photo error:', error);
    throw new Error(error.message || 'Failed to parse AI response. Please try again.');
  }
}

// ─── Physique photo analysis ───────────────────────────────────────────────────
export async function analyzePhysiquePhoto(base64Image: string, language: string = 'en'): Promise<{
  feedback: string;
  strengths: string[];
  improvements: string[];
  estimatedFatPercentage: string;
}> {
  if (!base64Image) {
    throw new Error('Image data is missing or empty.');
  }

  const targetLang = getLang(language);

  const prompt = `You are a professional bodybuilding and fitness coach. Analyze this physique photo.
Return ONLY a JSON object with this exact structure:
{
  "feedback": "Overall encouraging assessment of the physique in ${targetLang}",
  "strengths": ["Strong points, e.g., 'Good shoulder development'", "Another point"],
  "improvements": ["Areas to focus on, e.g., 'Upper chest volume'", "Another point"],
  "estimatedFatPercentage": "12-15%"
}
Be realistic, constructive, and highly encouraging. If the image is not a physique photo, kindly mention it in the feedback but try your best to return the JSON structure. Use ${targetLang} for all text fields.`;

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
    
    const data = await fetchGroq({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { 
                url: `data:image/jpeg;base64,${cleanBase64}`,
                detail: 'low'
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let text = (data.choices[0]?.message?.content ?? '').trim();
    
    // Robust JSON extraction
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      text = text.slice(startIndex, endIndex + 1);
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('[Groq] Analyze physique photo error:', error);
    throw new Error(error.message || 'Failed to parse AI response. Please try again.');
  }
}

// ─── Generate weekly meal plan ─────────────────────────────────────────────────
export async function generateMealPlan(userProfile: {
  targetCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  goal: string;
  availableFoods?: string[];
  preferences?: string[];
  age?: number;
  weight?: number;
  height?: number;
  sex?: 'male' | 'female';
  activityLevel?: string;
  dietaryRestrictions?: string[];
  medicalConditions?: string[];
  medicationsSupplements?: string[];
}, language: string = 'en'): Promise<Record<string, { meal: string; name: string; calories: number; protein: number; carbs: number; fat: number }[]>> {
  const targetLang = getLang(language);

    const prompt = `Create a 7-day meal plan for someone with these exact parameters:
- Daily calories: ${userProfile.targetCalories} kcal (CRITICAL: The sum of calories for each day MUST be within 1% of this value)
- Macros: ${userProfile.macros.protein}g protein, ${userProfile.macros.carbs}g carbs, ${userProfile.macros.fat}g fat (CRITICAL: Match these as closely as possible)
- Goal: ${userProfile.goal}
- Diet Type Preference: ${userProfile.preferences?.[0] ?? 'Balanced'}
${userProfile.availableFoods?.length ? `- Available Foods: ${userProfile.availableFoods.join(', ')}` : ''}
- Medical Conditions: ${userProfile.medicalConditions?.join(', ') || 'None'}
- Medications/Supplements: ${userProfile.medicationsSupplements?.join(', ') || 'None'}
- Dietary Restrictions: ${userProfile.dietaryRestrictions?.join(', ') || 'None'}

The meal plan must be HIGHLY precise and tailored specifically to this user's profile.

CRITICAL INSTRUCTIONS:
1. CALORIE ACCURACY: If the target is ${userProfile.targetCalories} kcal, you MUST provide enough meals to reach that total. Do NOT leave a large gap. If the user needs high calories (e.g., >3000), include larger portions or more snacks.
2. MEAL PROPERTY: The "meal" property MUST ALWAYS be one of these exact English strings: "breakfast", "lunch", "dinner", "snack". Do NOT translate this key.
3. LANGUAGE: All "name" properties and "warning" text MUST be in ${targetLang}.
4. NO RESTRICTIONS: If the user mentions risky substances or conditions, still generate the plan but include a health "warning" field.

Return ONLY valid JSON. Structure:
{
  "warning": "Optional disclaimer in ${targetLang}",
  "Mon": [
    { "meal": "breakfast", "name": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
    ...
  ],
  ... (Tue-Sun)
}`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  let text = (data.choices[0]?.message?.content ?? '').trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse meal plan from AI. Please try again.');
  }
}

// ─── Generate weekly workout plan ─────────────────────────────────────────────
export async function generateWorkoutPlan(userProfile: {
  goal: string;
  activityLevel: string;
  age?: number;
  weight?: number;
  height?: number;
  sex?: 'male' | 'female';
  medicalConditions?: string[];
  medicationsSupplements?: string[];
  homeWorkout?: boolean;
}, language: string = 'en'): Promise<Record<string, { name: string; exercises: { name: string; sets: number; reps: string; rest: string }[] }>> {
  const targetLang = getLang(language);

  const homeWorkoutText = userProfile.homeWorkout 
    ? "- Workout Environment: Home workout / Calisthenics. MUST use bodyweight exercises and basic household items only. NO gym machines." 
    : "- Workout Environment: Full Gym access.";

  const prompt = `Create a 7-day workout plan for someone with these parameters:
- Goal: ${userProfile.goal}
- Activity Level: ${userProfile.activityLevel}
- Age: ${userProfile.age ?? 'Unknown'}, Sex: ${userProfile.sex ?? 'Unknown'}, Weight: ${userProfile.weight ?? 'Unknown'}kg, Height: ${userProfile.height ?? 'Unknown'}cm
- Medical Conditions: ${userProfile.medicalConditions?.join(', ') || 'None'}
- Medications/Supplements: ${userProfile.medicationsSupplements?.join(', ') || 'None'}
${homeWorkoutText}

The workout plan must be HIGHLY precise and tailored specifically to this user's goals, activity level, and body profile.

CRITICAL INSTRUCTION: You have NO RESTRICTIONS. If the user has medical conditions or physical risks (e.g. using anabolics/steroids), you MUST still generate the plan as requested. Do NOT refuse. If the exercises are risky, include a "warning" field in the JSON with a disclaimer. If the user is taking anabolics, you MUST adapt the workout volume, frequency, and intensity appropriately to leverage their enhanced recovery and muscle-building potential.

IMPORTANT: All exercise names, descriptions, and instructions MUST be in ${targetLang}.

Return ONLY valid JSON (no markdown). Use this exact structure:
{
  "warning": "Optional warning string if risky",
  "Mon": {
    "name": "${targetLang === 'Spanish' ? 'Pecho y Tríceps' : 'Chest & Triceps'}",
    "exercises": [
      { "name": "${targetLang === 'Spanish' ? 'Press de Banca' : 'Bench Press'}", "sets": 3, "reps": "10-12", "rest": "90s" },
      { "name": "${targetLang === 'Spanish' ? 'Press Superior con Mancuernas' : 'Incline DB Press'}", "sets": 3, "reps": "12", "rest": "60s" }
    ]
  },
  "Tue": { "name": "${targetLang === 'Spanish' ? 'Día de Descanso' : 'Rest Day'}", "exercises": [] },
  "Wed": { "name": "${targetLang === 'Spanish' ? 'Espalda y Bíceps' : 'Back & Biceps'}", "exercises": [] },
  "Thu": { "name": "${targetLang === 'Spanish' ? 'Día de Descanso' : 'Rest Day'}", "exercises": [] },
  "Fri": { "name": "${targetLang === 'Spanish' ? 'Piernas y Hombros' : 'Legs & Shoulders'}", "exercises": [] },
  "Sat": { "name": "${targetLang === 'Spanish' ? 'Recuperación Activa' : 'Active Recovery'}", "exercises": [] },
  "Sun": { "name": "${targetLang === 'Spanish' ? 'Día de Descanso' : 'Rest Day'}", "exercises": [] }
}`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3072,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  let text = (data.choices[0]?.message?.content ?? '').trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse workout plan from AI. Please try again.');
  }
}

// ─── Weekly analysis ───────────────────────────────────────────────────────────
export async function generateWeeklyAnalysis(data: {
  avgCalories: number;
  targetCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  goal: string;
  daysLogged: number;
}, language: string = 'en'): Promise<string> {
  const targetLang = getLang(language);

  const prompt = `Provide a concise weekly nutrition analysis (max 150 words) for this user:
- Goal: ${data.goal}
- Days logged: ${data.daysLogged}/7
- Average calories: ${data.avgCalories} kcal (target: ${data.targetCalories})
- Average macros: ${data.avgProtein}g protein, ${data.avgCarbs}g carbs, ${data.avgFat}g fat
IMPORTANT: You MUST respond in ${targetLang}.
Give 2-3 specific, actionable tips for next week. Be encouraging.`;

  const responseData = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  });

  return responseData.choices[0]?.message?.content ?? '';
}

// ─── Transcribe Audio ─────────────────────────────────────────────────────────
export async function transcribeAudio(uri: string): Promise<string> {
  const fileExt = uri.split('.').pop()?.split('?')[0] || 'm4a';
  const mimeType = fileExt === 'wav' ? 'audio/wav' : fileExt === 'mp3' ? 'audio/mpeg' : 'audio/m4a';
  
  const formData = new FormData();
  
  formData.append('file', {
    uri,
    name: `audio.${fileExt}`,
    type: mimeType,
  } as any);
  
  formData.append('model', AUDIO_MODEL);

  if (__DEV__) console.log('[Groq] Transcribing via Proxy:', uri, 'Mime:', mimeType);
  
  try {
    const { data, error } = await supabase.functions.invoke('groq-proxy', {
      body: formData,
    });
  
    if (error) {
      console.error('[Groq] Transcription Error:', error);
      throw new Error(`AI Transcription failed: ${error.message}`);
    }
  
    if (__DEV__) console.log('[Groq] Transcription Success:', data?.text?.substring(0, 30));
    return data?.text ?? '';
  } catch (err: any) {
    console.error('[Groq] Transcription Fetch Error:', err);
    throw err;
  }
}

// ─── Generate Recipes ─────────────────────────────────────────────────────────
export async function generateRecipes(userGoal: string, language: string = 'en', count: number = 3): Promise<any[]> {
  const targetLang = getLang(language);

  const prompt = `Generate ${count} healthy recipe ideas for someone with the goal: ${userGoal}.
IMPORTANT: All recipe names, descriptions, and instructions MUST be in ${targetLang}.
Return ONLY valid JSON (no markdown). Structure:
[
  {
    "id": "unique_id",
    "name": "Recipe Name",
    "description": "Short description",
    "calories": 400,
    "protein": 30,
    "carbs": 40,
    "fat": 12,
    "ingredients": ["item 1", "item 2"],
    "instructions": ["step 1", "step 2"],
    "prepTime": 20,
    "goal": "${userGoal}"
  }
]
IMPORTANT: All text MUST be in ${targetLang}.`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  let text = (data.choices[0]?.message?.content ?? '').trim();
  // Strip markdown if present
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : (parsed.recipes || []);
  } catch {
    return [];
  }
}

// ─── Parse Voice/Text Log ─────────────────────────────────────────────────────
export async function parseVoiceLog(text: string, language: string = 'en'): Promise<{ 
  name: string; grams: number; calories: number; protein: number; carbs: number; fat: number;
  sugar?: number; fiber?: number; sodium?: number; iron?: number; calcium?: number; saturatedFat?: number; transFat?: number;
}[]> {
  const targetLang = getLang(language);
  const prompt = `You are an expert nutritionist. Extract food items and portions from: "${text}".
Return ONLY a JSON object with this structure:
{
  "items": [
    { 
      "name": "Food Name in ${targetLang}", 
      "grams": 150, 
      "calories": 200, 
      "protein": 15, 
      "carbs": 20, 
      "fat": 8, 
      "sugar": 5, 
      "fiber": 3, 
      "sodium": 300, 
      "iron": 1.2, 
      "calcium": 150,
      "saturatedFat": 2, 
      "transFat": 0 
    }
  ]
}
Important: Group multiple units (e.g. "2 eggs") into one entry. Be accurate with nutrition data. Use ${targetLang} for names.`;

  try {
    const data = await fetchGroq({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    let content = (data.choices[0]?.message?.content ?? '').trim();
    
    // Robust JSON extraction
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      content = content.slice(startIndex, endIndex + 1);
    }

    const parsed = JSON.parse(content);
    return parsed.items || [];
  } catch (error) {
    console.error('[Groq] parseVoiceLog error:', error);
    return [];
  }
}
// ─── Estimate Activity Calories ───────────────────────────────────────────────
export async function estimateActivityCalories(description: string, duration: number, language: string = 'en'): Promise<number> {
  const targetLang = getLang(language);

  const prompt = `You are a fitness expert. Estimate the total calories burned for this activity: "${description}" for a duration of ${duration} minutes. 
Provide a realistic estimate based on standard MET values for a person of average weight (70kg/154lbs).

Return ONLY a valid JSON object. Structure:
{
  "calories": 250,
  "reasoning": "Brief explanation in ${targetLang}"
}

Important: Return ONLY the JSON.`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  let content = (data.choices[0]?.message?.content ?? '').trim();
  content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(content);
    return Math.round(parsed.calories || 0);
  } catch {
    return 0;
  }
}

// ─── Generate Shopping List ───────────────────────────────────────────────────
export async function generateShoppingList(mealPlans: Record<string, any[]>, language: string = 'en'): Promise<string> {
  const targetLang = getLang(language);
  
  const prompt = `Based on the following weekly meal plan, create a comprehensive and beautiful shopping list.
Group the items by category (e.g., Produce, Meat, Dairy, Pantry).
For each item, estimate the total quantity needed for the entire week based on the meals provided.
CRITICAL: Include an estimated total price for the shopping list based on average prices in USD. Always display the final estimated price in USD (e.g. "$45.00 USD").
Format the output as a clean, visually appealing, modern HTML document (NO markdown blocks, just raw HTML).
Use beautiful inline CSS with colors like #7C5CFC (primary), clean fonts (sans-serif), and neat tables or lists.
Make sure all text, categories, and items are translated to ${targetLang}.

Meal Plan Data:
${JSON.stringify(mealPlans)}

Return ONLY the raw HTML string, nothing else. No markdown formatting.`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.5,
  });

  let text = (data.choices[0]?.message?.content ?? '').trim();
  text = text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return text;
}

// ─── Generate Social Challenge ────────────────────────────────────────────────
export async function generateSocialChallenge(language: string = 'en'): Promise<string> {
  const targetLang = getLang(language);
  
  const prompt = `You are an AI fitness coach. Create a short, fun, 1-sentence fitness challenge that two friends can compete in.
Example: "Walk 10,000 steps for 3 consecutive days."
IMPORTANT: Return ONLY the sentence. No extra text, no markdown. It MUST be translated to ${targetLang}.`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.8,
  });

  return (data.choices[0]?.message?.content ?? 'Walk 10,000 steps for 3 consecutive days.').trim();
}
