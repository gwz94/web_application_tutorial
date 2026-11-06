// Sends a food photo to Google Gemini and asks it to estimate calories.

export type FoodItem = {
  name: string;
  portion: string;
  calories: number;
};

export type CalorieEstimate = {
  isFood: boolean;
  items: FoodItem[];
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
};

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-flash-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = `You are a nutrition expert. Look at this photo and estimate the calories in the food shown.
Identify each distinct food item, estimate its portion size (use visual cues like plate size and utensils),
and estimate its calories. Also estimate total protein, carbs and fat in grams for the whole meal.
If the photo does not contain food, set isFood to false, return an empty items list and zeros.
Use the notes field for a short (1-2 sentence) explanation of your assumptions.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isFood: { type: 'BOOLEAN' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          portion: { type: 'STRING' },
          calories: { type: 'INTEGER' },
        },
        required: ['name', 'portion', 'calories'],
      },
    },
    totalCalories: { type: 'INTEGER' },
    proteinGrams: { type: 'INTEGER' },
    carbsGrams: { type: 'INTEGER' },
    fatGrams: { type: 'INTEGER' },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    notes: { type: 'STRING' },
  },
  required: [
    'isFood', 'items', 'totalCalories', 'proteinGrams',
    'carbsGrams', 'fatGrams', 'confidence', 'notes',
  ],
};

export async function estimateCalories(base64Jpeg: string): Promise<CalorieEstimate> {
  if (!API_KEY) {
    throw new Error(
      'Missing Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY to the .env file and restart the app.'
    );
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Gemini request failed (model "${MODEL}"): ${message}`);
  }

  const text: string | undefined = body?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('');
  if (!text) {
    const reason = body?.promptFeedback?.blockReason ?? body?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini returned no answer${reason ? ` (${reason})` : ''}.`);
  }

  try {
    return JSON.parse(text) as CalorieEstimate;
  } catch {
    throw new Error('Could not read Gemini\'s answer. Please try again.');
  }
}
