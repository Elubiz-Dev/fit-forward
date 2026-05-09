/**
 * AI service for FitGO — powered by Groq (using native fetch for React Native compatibility).
 * Maintains the same exported API as the previous service so the
 * rest of the app requires zero changes.
 *
 * Functions:
 *  - buildCoachSystemPrompt
 *  - sendCoachMessage
 *  - analyzeFoodPhoto
 *  - generateMealPlan
 *  - generateWeeklyAnalysis
 *  - transcribeAudio
 *  - generateRecipes
 *  - parseVoiceLog
 */

import { supabase } from './supabase';

// ─── Model IDs ────────────────────────────────────────────────────────────────
const CHAT_MODEL   = 'llama-4-scout-17b-instruct';
const VISION_MODEL = 'llama-4-scout-17b-instruct'; // Based on availability in your dashboard
const AUDIO_MODEL  = 'whisper-large-v3';

// Helper to use Supabase Edge Function as a proxy
async function fetchGroq(payload: any) {
  const { data, error } = await supabase.functions.invoke('groq-proxy', {
    body: payload,
  });

  if (error) {
    console.error('[Groq Proxy Error]:', error);
    
    // Attempt to extract details from the error response body
    let errorMsg = error.message || 'Unknown error';
    
    if (error && typeof error === 'object' && 'context' in error) {
      const context = (error as any).context;
      // If it's a response object, we might not be able to await it here easily
      // but let's try to see if it has some already parsed data or status
      if (context.status === 400) {
        errorMsg = `Bad Request (400) - Check model/params.`;
      }
    }

    // If data exists despite error (unlikely with invoke), it might contain the error body
    if (data && data.error) {
      errorMsg = data.error.message || JSON.stringify(data.error);
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
}, language: string = 'en', coachType: 'nutritionist' | 'trainer' = 'nutritionist') {
  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
  };
  const targetLang = langNames[language] || 'English';

  const basicStats = `- Age: ${userProfile.age ?? 'Unknown'}, Sex: ${userProfile.sex ?? 'Unknown'}, Weight: ${userProfile.weight ?? 'Unknown'}kg, Height: ${userProfile.height ?? 'Unknown'}cm
- Activity Level: ${userProfile.activityLevel ?? 'Unknown'}
- Goal: ${userProfile.goal}`;

  const healthData = `
Health Profile (CRITICAL):
- Medical Conditions: ${userProfile.medicalConditions?.length && !userProfile.medicalConditions.includes('none') ? userProfile.medicalConditions.join(', ') : 'None reported'}
- Medications/Supplements: ${userProfile.medicationsSupplements?.length && !userProfile.medicationsSupplements.includes('none') ? userProfile.medicationsSupplements.join(', ') : 'None reported'}
- Dietary Restrictions: ${userProfile.dietaryRestrictions?.length && !userProfile.dietaryRestrictions.includes('none') ? userProfile.dietaryRestrictions.join(', ') : 'None reported'}
- Diet Type Preference: ${userProfile.preferences?.[0] ?? 'Balanced'}`;

  if (coachType === 'trainer') {
    return `You are Fitz, an expert AI personal trainer inside the FitGO app.
IMPORTANT: You MUST respond in ${targetLang}.

User profile:
- Name: ${userProfile.name}
${basicStats}
${healthData}

Guidelines:
1. Act exclusively as a personal trainer. Focus entirely on workouts, exercises, physical conditioning, and training routines.
2. Always tailor advice specifically to the user's fitness goal (${userProfile.goal}), adjusting exercise selection, volume, and intensity accordingly.
3. CRITICAL: Take into account any medical conditions or physical limitations mentioned in the Health Profile when suggesting exercises or intensities to avoid injury.
4. When suggesting routines, provide clear structure: warm-up, exercises (with sets, reps, and rest times), and cool-down.
5. Keep responses concise and action-oriented (under 200 words unless a detailed plan is requested).
6. Be highly motivating and encouraging, like a professional real-life personal trainer.
7. If the user asks about diets, macros, or nutrition, gently remind them that you are currently in "Personal Trainer" mode and they should switch to the "Nutritionist" tab for dietary advice.`;
  }

  return `You are Fitz, an expert AI nutritionist inside the FitGO app.
IMPORTANT: You MUST respond in ${targetLang}.

User profile:
- Name: ${userProfile.name}
${basicStats}
- TDEE: ${userProfile.tdee} kcal/day
- Daily calorie target: ${userProfile.targetCalories} kcal
- Macro targets: ${userProfile.macros.protein}g protein, ${userProfile.macros.carbs}g carbs, ${userProfile.macros.fat}g fat
${userProfile.availableFoods?.length ? `- Available Foods: ${userProfile.availableFoods.join(', ')}` : ''}
${healthData}

Guidelines:
1. Act exclusively as a nutritionist and dietitian. Focus on food, calories, macros, recipes, digestion, and dietary habits.
2. Always tailor advice strictly to the user's goal (${userProfile.goal}) and their specific calorie/macro targets.
3. CRITICAL: You MUST strictly adhere to the user's Dietary Restrictions, Medical Conditions, and Diet Type Preference. Never suggest foods that conflict with these constraints.
4. When suggesting meals or foods, include rough macronutrient estimates to help them hit their daily goals.
5. Keep responses concise, practical, and science-backed (under 200 words unless a detailed meal plan is requested).
6. Be empathetic, supportive, and non-judgmental regarding their dietary journey.
7. If the user asks about workout routines or physical exercises, gently remind them that you are currently in "Nutritionist" mode and they should switch to the "Personal Trainer" tab for workout advice.`;
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
    sugar?: number; fiber?: number; sodium?: number; iron?: number; saturatedFat?: number; transFat?: number;
  }[];
  totalCalories: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}> {
  if (!base64Image) {
    throw new Error('Image data is missing or empty.');
  }

  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
  };
  const targetLang = langNames[language] || 'English';

  const prompt = `Analyze this food image and return ONLY a JSON object with this structure: {"foods": [{"name": "food name", "grams": 150, "calories": 250, "protein": 20, "carbs": 30, "fat": 8}], "totalCalories": 250, "confidence": "high", "notes": ""}. Important: Use ${targetLang} for names and notes.`;

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
  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
  };
  const targetLang = langNames[language] || 'English';

  const prompt = `Create a 7-day meal plan for someone with these parameters:
- Daily calories: ${userProfile.targetCalories} kcal
- Macros: ${userProfile.macros.protein}g protein, ${userProfile.macros.carbs}g carbs, ${userProfile.macros.fat}g fat
- Goal: ${userProfile.goal}
- Diet Type Preference: ${userProfile.preferences?.[0] ?? 'Balanced'}
${userProfile.availableFoods?.length ? `- Available Foods: ${userProfile.availableFoods.join(', ')}` : ''}

CRITICAL HEALTH CONSTRAINTS:
- Medical Conditions: ${userProfile.medicalConditions?.length && !userProfile.medicalConditions.includes('none') ? userProfile.medicalConditions.join(', ') : 'None'}
- Medications/Supplements: ${userProfile.medicationsSupplements?.length && !userProfile.medicationsSupplements.includes('none') ? userProfile.medicationsSupplements.join(', ') : 'None'}
- Dietary Restrictions: ${userProfile.dietaryRestrictions?.length && !userProfile.dietaryRestrictions.includes('none') ? userProfile.dietaryRestrictions.join(', ') : 'None'}

IMPORTANT INSTRUCTION: You MUST strictly adhere to the health constraints above. Do not include any ingredients that conflict with their medical conditions or dietary restrictions.

IMPORTANT: All meal names, descriptions, and instructions MUST be in ${targetLang}.

Return ONLY valid JSON (no markdown). Use this exact structure:
{
  "Mon": [
    { "meal": "breakfast", "name": "Oatmeal with berries", "calories": 350, "protein": 12, "carbs": 60, "fat": 8 },
    { "meal": "lunch", "name": "Grilled chicken salad", "calories": 450, "protein": 40, "carbs": 20, "fat": 15 },
    { "meal": "dinner", "name": "Salmon with vegetables", "calories": 500, "protein": 45, "carbs": 25, "fat": 20 },
    { "meal": "snack", "name": "Greek yogurt", "calories": 150, "protein": 15, "carbs": 12, "fat": 3 }
  ],
  "Tue": [],
  "Wed": [],
  "Thu": [],
  "Fri": [],
  "Sat": [],
  "Sun": []
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
}, language: string = 'en'): Promise<Record<string, { name: string; exercises: { name: string; sets: number; reps: string; rest: string }[] }>> {
  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
  };
  const targetLang = langNames[language] || 'English';

  const prompt = `Create a 7-day workout plan for someone with these parameters:
- Goal: ${userProfile.goal}
- Activity Level: ${userProfile.activityLevel}
- Age: ${userProfile.age ?? 'Unknown'}, Sex: ${userProfile.sex ?? 'Unknown'}, Weight: ${userProfile.weight ?? 'Unknown'}kg, Height: ${userProfile.height ?? 'Unknown'}cm

CRITICAL HEALTH CONSTRAINTS:
- Medical Conditions: ${userProfile.medicalConditions?.length && !userProfile.medicalConditions.includes('none') ? userProfile.medicalConditions.join(', ') : 'None'}

IMPORTANT INSTRUCTION: You MUST strictly adhere to the health constraints above. Do not include exercises that could exacerbate their medical conditions. Modify intensity and selection accordingly.

IMPORTANT: All exercise names, descriptions, and instructions MUST be in ${targetLang}.

Return ONLY valid JSON (no markdown). Use this exact structure:
{
  "Mon": {
    "name": "Chest & Triceps",
    "exercises": [
      { "name": "Bench Press", "sets": 3, "reps": "10-12", "rest": "90s" },
      { "name": "Incline DB Press", "sets": 3, "reps": "12", "rest": "60s" }
    ]
  },
  "Tue": { "name": "Rest Day", "exercises": [] },
  "Wed": { "name": "Back & Biceps", "exercises": [] },
  "Thu": { "name": "Rest Day", "exercises": [] },
  "Fri": { "name": "Legs & Shoulders", "exercises": [] },
  "Sat": { "name": "Active Recovery", "exercises": [] },
  "Sun": { "name": "Rest Day", "exercises": [] }
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
  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
  };
  const targetLang = langNames[language] || 'English';

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

  if (__DEV__) console.log('[Groq] Transcribing via Edge Function:', uri);
  
  const { data, error } = await supabase.functions.invoke('groq-proxy', {
    body: formData,
  });

  if (error) {
    console.error('[Groq] Transcription Proxy Error:', error);
    throw new Error(`Transcription error: ${error.message}`);
  }

  return data.text ?? '';
}

// ─── Generate Recipes ─────────────────────────────────────────────────────────
export async function generateRecipes(userGoal: string, language: string = 'en', count: number = 3): Promise<any[]> {
  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
  };
  const targetLang = langNames[language] || 'English';

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
export async function parseVoiceLog(text: string, language: string = 'en'): Promise<any[]> {
  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German', ru: 'Russian'
  };
  const targetLang = langNames[language] || 'English';

  const prompt = `Extract food items and estimated portions from this description: "${text}"
IMPORTANT: Extract the food names in ${targetLang}.
Return ONLY valid JSON. Structure:
{
  "items": [
    { "name": "Apple", "grams": 180, "calories": 95, "protein": 0, "carbs": 25, "fat": 0, "sugar": 19, "fiber": 4, "sodium": 2, "iron": 0.2, "saturatedFat": 0, "transFat": 0 },
    { "name": "Black Coffee", "grams": 250, "calories": 2, "protein": 0, "carbs": 0, "fat": 0, "sugar": 0, "fiber": 0, "sodium": 5, "iron": 0, "saturatedFat": 0, "transFat": 0 }
  ]
}`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  let content = (data.choices[0]?.message?.content ?? '').trim();
  content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(content);
    return parsed.items || [];
  } catch {
    return [];
  }
}
