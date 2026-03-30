// ============================================================
//  Gemini Service — Vercel AI SDK
//  Handles all LLM operations via a provider-agnostic interface
//  TRANSFORMED TO JAVASCRIPT (ESM) | PRODUCTION OPTIMIZED
// ============================================================

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

// ---- Microservice Configuration ----
export const serviceConfig = {
  useMockData: process.env.USE_MOCK_DATA === "true",
  bnRecipeApi: process.env.BN_RECIPE_API || "https://bn-new-api.balancenutritiononline.com/api/v1/recipe/all",
  bnClientApi: process.env.BN_CLIENT_API_URL || "https://bn-new-api.balancenutritiononline.com/api/v1/client-details/get-single-client-by-user_id",
  bnShopApi: process.env.BN_SHOP_API || "https://bn-new-api.balancenutritiononline.com/api/v1/shop-product/all-products",
};

// ---- Production Store (Server-Side) ----
// Key: slug, Value: full recipe object (Ingredients, Method, etc.)
let recipeStore = {};
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

// Fallback: load static data if API fails
let staticFallback = [];

async function loadFallbackRecipes() {
  try {
    const mod = await import("./data/recipeData.js");
    staticFallback = mod.recipes;
    staticFallback.forEach(r => {
      if (!r.url && r.slug) {
        r.url = `https://www.balancenutrition.in/recipes/${encodeURIComponent(r.category || 'All')}/${r.slug}`;
      }
      if (!recipeStore[r.slug]) recipeStore[r.slug] = r;
    });
    console.log(`[Cache] Pre-loaded ${staticFallback.length} fallback recipes`);
  } catch (err) {
    console.warn("[Cache] No fallback recipeData file found.");
  }
}

loadFallbackRecipes();

/**
 * Fetch recipes from Balance Nutrition API and sync with recipeStore.
 */
export async function fetchRecipes() {
  const now = Date.now();

  if (Object.keys(recipeStore).length > 500 && now - lastFetchTime < CACHE_TTL) {
    return Object.values(recipeStore);
  }

  if (serviceConfig.useMockData) {
    console.log("[Config] Mock Mode: Using static archive");
    return Object.values(recipeStore);
  }

  try {
    const fetchStart = Date.now();
    const res = await fetch(serviceConfig.bnRecipeApi, {
      method: 'POST',
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const json = await res.json();
    console.log(`[Sync] Recipe API response received in ${Date.now() - fetchStart}ms`);
    const data = Array.isArray(json) ? json[0] : json;
    const recipes = data.data || [];
    if (recipes.length > 0) {
      console.log(`[Sync] Sample recipe keys: ${Object.keys(recipes[0]).join(', ')}`);
      recipes.forEach((r) => {
        recipeStore[r.slug] = {
          id: r.id,
          title: r.title,
          slug: r.slug,
          category: r.category,
          sub_category: r.sub_category,
          cuisine: r.cuisine,
          recipe_type: r.recipe_type,
          ingredients: r.ingredients || [],
          image: r.recipe_thumbnail_images?.[0]?.file?.path || r.recipe_icon?.[0]?.file?.path || r.image || r.thumbnail || "",
          url: r.url || (r.slug ? `https://www.balancenutrition.in/recipes/${encodeURIComponent(r.category || 'All')}/${r.slug}` : ""),
          nutrient_tags: r.nutrient_tags || [],
          health_tags: r.health_tags || [],
          energy: r.meta_data?.energy || 0,
          protein: r.meta_data?.protein || 0,
          fat: r.meta_data?.fat || 0,
          carbs: r.meta_data?.carbs || 0,
          fiber: r.meta_data?.fiber || 0,
          calories: r.meta_data?.energy || r.meta_data?.calories || 0,
          health_meter: r.meta_data?.health_meter || "",
          method: r.meta_data?.method || [],
        };
      });
      lastFetchTime = now;
      console.log(`[BN API] Refreshed store: ${Object.keys(recipeStore).length} recipes total`);
      return Object.values(recipeStore);
    }
  } catch (err) {
    console.error(`[BN API] Live Sync ERROR: ${err.message}`, err);
    console.warn("[BN API] Sync failed, using available store:", err.message);
  }

  return Object.values(recipeStore);
}

// ---- BN Shop Store ----
let shopStore = [];
let lastShopFetch = 0;

/**
 * Sync with BN Shop API to get healthy product alternatives
 */
export async function fetchShopProducts() {
  const now = Date.now();
  if (shopStore.length > 0 && now - lastShopFetch < CACHE_TTL) {
    return shopStore;
  }

  try {
    const res = await fetch(serviceConfig.bnShopApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!res.ok) throw new Error(`Shop API returned ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json) ? json[0] : json;
    
    // Normalize products properly based on actual BN API structure
    if (data && data.status === "success" && data.data && Array.isArray(data.data.products)) {
      shopStore = data.data.products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.categories?.[0]?.name || "Healthy Alternative",
        slug: p.slug,
        image: p.thumbnail,
        price: p.price,
        description: p.description?.replace(/<[^>]*>/g, ' ').trim() || "",
        shopUrl: `https://shop.balancenutrition.in/product/${p.slug}`
      }));
      lastShopFetch = now;
      console.log(`[Shop API] Synced ${shopStore.length} products`);
    } else {
      console.warn(`[Shop API] Unexpected data structure:`, Object.keys(data));
    }
  } catch (err) {
    console.warn(`[Shop API] Sync failed: ${err.message}`);
  }
  return shopStore;
}

/**
 * Matches basket items with BN Shop products using smart keyword intersection.
 * Prioritizes premium categories: Healthy Grains, Healthy Millets, Wood-Pressed Oils.
 */
export async function findShopAlternatives(basketItems) {
  const shopProducts = await fetchShopProducts();
  if (!shopProducts.length) return [];

  // Define priority categories from the BN Shop catalog
  const PRIORITY_CATEGORIES = ['Healthy Grains', 'Healthy Millets', 'Wood-Pressed Oils'];

  const results = basketItems.map(item => {
    const itemNameLower = item.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const itemWords = itemNameLower.split(' ').filter(w => w.length > 2);

    if (itemWords.length === 0) return null;

    // Filter products that match based on keywords/staples
    const candidates = shopProducts.filter(p => {
      const pNameLower = p.name.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      const pWords = pNameLower.split(' ');

      // Direct exact sub-string match first
      const isSubstrMatch = pNameLower.includes(itemNameLower) || itemNameLower.includes(pNameLower);
      if (isSubstrMatch) return true;

      // Word intersection matching
      const hasWordMatch = itemWords.some(word => pWords.includes(word));
      if (hasWordMatch) return true;
      
      // Specifically catch common staples that BN sells
      const isStapleMatch = 
        (itemNameLower.includes('barley') && pNameLower.includes('barley')) ||
        (itemNameLower.includes('oats') && pNameLower.includes('oats')) ||
        (itemNameLower.includes('makhana') && pNameLower.includes('makhana')) ||
        (itemNameLower.includes('poha') && pNameLower.includes('poha')) ||
        (itemNameLower.includes('chana') && pNameLower.includes('chana')) ||
        (itemNameLower.includes('ghee') && pNameLower.includes('ghee')) ||
        (itemNameLower.includes('flour') && pNameLower.includes('atta')) ||
        (itemNameLower.includes('atta') && pNameLower.includes('atta')) ||
        (itemNameLower.includes('peanut butter') && pNameLower.includes('peanut butter')) ||
        (itemNameLower.includes('oil') && pNameLower.includes('oil'));

      return isStapleMatch;
    });

    if (candidates.length === 0) return null;

    // Sort candidates to prioritize premium categories
    const sorted = candidates.sort((a, b) => {
      const aPrio = PRIORITY_CATEGORIES.includes(a.category) ? 0 : 1;
      const bPrio = PRIORITY_CATEGORIES.includes(b.category) ? 0 : 1;
      return aPrio - bPrio;
    });

    const match = sorted[0];

    return {
      original: item,
      alternative: match.name,
      category: match.category,
      shopUrl: match.shopUrl,
      image: match.image,
      price: match.price
    };
  }).filter(Boolean);

  return results;
}

/**
 * Stage 1: Backend Pre-filtering (Hard Rules)
 * Filters the database based on diet, allergies, and data quality.
 * Results are logged to the terminal for visibility.
 */
function preFilterRecipes(recipes, profile) {
  const isVeg = profile.dietType?.toLowerCase().includes("veg") && !profile.dietType?.toLowerCase().includes("non");
  const isJain = profile.dietType?.toLowerCase().includes("jain");
  
  const allergyArr = (profile.allergies && profile.allergies !== "None")
    ? profile.allergies.toLowerCase().split(",").map(a => a.trim()).filter(a => a.length > 0)
    : [];

  const aversionArr = (profile.aversions && profile.aversions !== "None")
    ? profile.aversions.toLowerCase().split(",").map(a => a.trim()).filter(a => a.length > 0)
    : [];

  const filtered = recipes.filter(r => {
    // 1. Data Integrity: Must have macros
    if (!r.calories || r.calories === 0) return false;
    
    // 2. Diet Type
    if (isVeg && r.recipe_type?.toLowerCase().includes("non-veg")) return false;
    if (isJain) {
      const title = r.title?.toLowerCase() || "";
      if (title.includes("onion") || title.includes("garlic")) return false;
    }

    // 3. Clinical Safety: Allergies & Aversions
    const titleLower = r.title?.toLowerCase() || "";
    if (allergyArr.some(a => titleLower.includes(a))) return false;
    if (aversionArr.some(a => titleLower.includes(a))) return false;
    
    return true;
  });

  return filtered;
}

/**
 * Phase 2: Tiered Selection (Token Optimization)
 * Selects a balanced subset of recipes to keep tokens ~6k.
 */
function getTieredRecipeSelection(recipes, profile) {
  const start = Date.now();
  const targetCalories = calculateDailyCalories(profile);
  const cuisinePref = (profile.cuisine || "Indian").toLowerCase();
  
  // 1. Base Filter (Hard Rules)
  const baseValid = preFilterRecipes(recipes, profile);
  
  // 2. Calorie Relevance Filter
  // Limit to recipes between 30 and 800 calories to avoid irrelevant condiments/oversized meals
  const relevant = baseValid.filter(r => r.calories >= 30 && r.calories <= 800);

  // 3. Split by Priority
  const tier1 = relevant.filter(r => r.cuisine?.toLowerCase().includes(cuisinePref));
  const other = relevant.filter(r => !r.cuisine?.toLowerCase().includes(cuisinePref));

  // 4. Balanced Selection (Target ~350 recipes for ~6k tokens)
  // We want a mix across major categories even in Tier 1
  const selectFrom = (list, count) => {
    return list.sort(() => 0.5 - Math.random()).slice(0, count);
  };

  // Prioritize preferred cuisine, then fill with variety
  let selection = tier1.slice(0, 250); 
  if (selection.length < 350) {
    selection = [...selection, ...selectFrom(other, 350 - selection.length)];
  }

  console.log(`[Selector] ${selection.length} recipes selected from ${recipes.length} in ${Date.now() - start}ms`);
  return selection;
}

/**
 * Phase 2: AI Selection (Smart Rules)
 * Generates the compact recipe vault for the prompt.
 */
function getCompactRecipeArchive(recipes, profile) {
  const start = Date.now();
  
  // Use professional tiered selection instead of passing all recipes
  const selectedRecipes = getTieredRecipeSelection(recipes, profile);

  // Build ultra-compact archive: slug|name|cal|pro|carb|fat
  const archiveStr = selectedRecipes.map(r => 
    `${r.slug}|${r.title}|${r.calories}|${Math.round(r.protein)}|${Math.round(r.carbs)}|${Math.round(r.fat)}`
  ).join("\n");

  const estTokens = Math.ceil(archiveStr.length / 4);
  console.log(`[Vault] Generated vault: ${selectedRecipes.length} recipes, ${archiveStr.length} chars, ~${estTokens} tokens`);
  return archiveStr;
}


/**
 * Fetch client profile from Balance Nutrition API
 */
export async function fetchUserProfile(userId) {
  if (serviceConfig.useMockData) {
    return {
      age: "30", weight: "65", height: "160", gender: "Female", goal: "Weight Loss",
      dietType: "Vegetarian", activityLevel: "Moderately Active", ethnicity: "Indian",
      cuisine: "North Indian", allergies: "None", aversions: "Mushrooms",
    };
  }

  const cleanBaseUrl = serviceConfig.bnClientApi.split("?")[0];
  const url = `${cleanBaseUrl}?user_id=${userId}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const json = await response.json();
    const client = json.data;
    const details = client.client_details || {};
    const weightData = client.weight || {};

    console.log(`[Data] Raw Profile fetched for ${userId}:`, JSON.stringify({
      eating_habit: details.eating_habit,
      cuisine: details.cuisine_preferance,
      goal: client.program_details?.program_name,
      key_insight: details.key_insight
    }, null, 2));

    return {
      age: details.age?.toString() || "30",
      weight: weightData.program_start_weight?.toString() || "70",
      height: details.height?.toString() || "160", 
      gender: details.gender || "Female",
      goal: client.program_details?.program_name || "Maintenance",
      dietType: details.eating_habit || "Vegetarian",
      activityLevel: details.activity_level || "Moderately Active",
      ethnicity: details.ethnicity || "Indian",
      cuisine: details.cuisine_preferance || "Indian",
      allergies: Array.isArray(details.allergies) ? details.allergies.join(", ") : (details.allergies || "None"),
      aversions: Array.isArray(details.aversions) ? details.aversions.join(", ") : (details.aversions || "None"),
      health_conditions: details.key_insight || "None",
    };
  } catch (err) {
    console.warn(`[BN API] Profile failed for user, using default. Error: ${err.message}`);
    return {
      age: "30", weight: "70", height: "170", gender: "Female", goal: "Weight Loss",
      dietType: "Vegetarian", activityLevel: "Sedentary", ethnicity: "Indian",
      cuisine: "Indian", allergies: "None",
    };
  }
}

// ---- Helpers ----

export function calculateDailyCalories(profile) {
  const weight = parseFloat(profile.weight);
  const height = parseFloat(profile.height);
  const age = parseFloat(profile.age);

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr += profile.gender === "Male" ? 5 : -161;

  const activityFactors = {
    "Sedentary": 1.2,
    "Lightly Active": 1.375,
    "Moderately Active": 1.55,
    "Very Active": 1.725,
  };
  const tdee = bmr * (activityFactors[profile.activityLevel] || 1.2);

  let target = tdee;
  if (profile.goal === "Weight Loss") target -= 500;
  else if (profile.goal === "Weight Gain") target += 500;

  return Math.max(Math.round(target), profile.gender === "Male" ? 1500 : 1200);
}

function inferCategory(title, slug, aiCategory) {
  const t = title.toLowerCase();
  const s = slug.toLowerCase();
  if (t.includes("soup") || s.includes("soup")) return "Soups";
  if (t.includes("salad") || s.includes("salad")) return "Salads";
  if (t.includes("juice") || t.includes("smoothie") || t.includes("tea")) return "Beverages";
  if (t.includes("dessert") || t.includes("sweets")) return "Desserts";
  if (aiCategory && aiCategory !== "Main-Course") return aiCategory;
  return "Main-Course";
}

/**
 * Hydrates a minimal AI recipe suggestion with full server-side data.
 * ENSURES 100% MACRO ACCURACY by pulling from recipeStore.
 */
function hydrateRecipe(aiRecipe) {
  const slug = aiRecipe.slug;
  const storeMatch = recipeStore[slug];

  if (!storeMatch) {
    // Fallback if AI hallucinated a slug
    return {
      name: aiRecipe.name || "Custom Suggested Meal",
      url: "#",
      calories: Number(aiRecipe.calories) || 0,
      protein: 0, carbs: 0, fats: 0,
      description: "Based on dietary preferences",
      servingSize: "1 Portion",
      ingredients: [],
      instructions: []
    };
  }

  let category = storeMatch.category || "Main-Course";
  category = category.charAt(0).toUpperCase() + category.slice(1);
  const finalCategory = inferCategory(storeMatch.title, storeMatch.slug, category);

  return {
    name: storeMatch.title,
    url: storeMatch.url || `https://www.balancenutrition.in/recipes/${encodeURIComponent(storeMatch.category || 'All')}/${storeMatch.slug}`,
    calories: Number(storeMatch.calories) || 0,
    protein: Number(storeMatch.protein) || 0,
    carbs: Number(storeMatch.carbs) || 0,
    fats: Number(storeMatch.fat) || 0,
    description: storeMatch.recipe_type || "",
    servingSize: "Standard Serving",
    prepTime: "20-30 mins",
    ingredients: storeMatch.ingredients || [],
    instructions: storeMatch.method || [],
  };
}

export function validateAndConstructRecipe(aiInput) {
  const start = Date.now();
  const inputs = Array.isArray(aiInput) ? aiInput : [aiInput];
  const results = inputs.map(hydrateRecipe);
  console.log(`[Hydration] Processed ${results.length} dishes in ${Date.now() - start}ms`);
  return results;
}

// ---- Prompt Builder ----

function build3DayPrompt(profile, targetCalories, archive) {
  // Calculate per-meal calorie budgets
  const bfCal = Math.round(targetCalories * 0.25);
  const lunchCal = Math.round(targetCalories * 0.30);
  const snackCal = Math.round(targetCalories * 0.15);
  const dinnerCal = Math.round(targetCalories * 0.30);

  // Calculate macro targets in grams
  const proteinG = Math.round((targetCalories * 0.22) / 4); // 22% of cals, 4cal/g
  const carbsG = Math.round((targetCalories * 0.52) / 4);   // 52% of cals, 4cal/g
  const fatsG = Math.round((targetCalories * 0.26) / 9);     // 26% of cals, 9cal/g

  // Goal-specific clinical instruction
  let goalAdvice = "";
  if (profile.goal?.toLowerCase().includes("loss")) {
    goalAdvice = "Focus on high-protein, high-fiber meals to promote satiety. Keep dinner lighter. Avoid fried items.";
  } else if (profile.goal?.toLowerCase().includes("gain")) {
    goalAdvice = "Include calorie-dense, nutrient-rich foods. Add healthy fats and complex carbs. Ensure adequate post-workout nutrition.";
  } else {
    goalAdvice = "Maintain balanced nutrition with variety. Focus on micronutrient diversity across meals.";
  }

  return `You are Clara AI, a Senior Clinical Dietitian at Balance Nutrition.
Create a personalized 3-DAY meal plan for this specific client.

═══ CLIENT PROFILE ═══
Age: ${profile.age} | Gender: ${profile.gender} | Weight: ${profile.weight}kg | Height: ${profile.height}cm
Goal: ${profile.goal}
Diet Type: ${profile.dietType}
Cuisine Preference: ${profile.cuisine || "Indian"}
Ethnicity: ${profile.ethnicity || "Indian"}
Allergies: ${profile.allergies || "None"}
Aversions: ${profile.aversions || "None"}
Health Conditions: ${profile.health_conditions || "None"}

═══ DAILY NUTRITIONAL TARGETS (STRICT) ═══
Total Daily Calories: ${targetCalories} kcal (tolerance ±100 kcal)
Protein: ~${proteinG}g | Carbs: ~${carbsG}g | Fats: ~${fatsG}g

Per-Meal Calorie Budget:
• Breakfast: ~${bfCal} kcal
• Lunch: ~${lunchCal} kcal
• Snack: ~${snackCal} kcal
• Dinner: ~${dinnerCal} kcal

═══ CLINICAL GUIDANCE ═══
${goalAdvice}
${profile.health_conditions && profile.health_conditions !== "None" ? `Special consideration for: ${profile.health_conditions}` : ""}

═══ RECIPE VAULT (format: slug|name|calories|protein|carbs|fat) ═══
${archive}

═══ RULES ═══
1. Use ONLY slugs from the vault above.
2. Each meal slot MUST be an array of recipe objects with "slug" field.
3. For Lunch and Dinner, COMBINE 2-3 recipes (e.g. rice + dal + sabzi, or pasta + salad) to reach the calorie target for that slot.
4. Do NOT repeat the same recipe across different days.
5. Avoid any ingredients matching the client's allergies or aversions.
6. CUISINE FOCUS: If the client prefers ${profile.cuisine}, prioritize those recipes. DO NOT default to Indian food if the preference is Mexican, Italian, or Continental.
7. Clinical Summary: Write a 2-3 sentence summary for each day explaining WHY these specific meals were chosen based on their Goal (${profile.goal}) and Health Conditions (${profile.health_conditions}).

═══ OUTPUT FORMAT (JSON array, exactly 3 objects) ═══
[
  {
    "day": "Day 1",
    "breakfast": [ { "slug": "recipe-slug-here" } ],
    "lunch": [ { "slug": "slug1" }, { "slug": "slug2" } ],
    "snack": [ { "slug": "slug3" } ],
    "dinner": [ { "slug": "slug4" }, { "slug": "slug5" } ],
    "summary": "Personalized clinical reasoning for this client..."
  }
]`;
}

// ---- Main Service Exports ----

export async function* generateMealPlanStream(profile) {
  const generationStart = Date.now();
  console.log(`\n[Diet Gen] --- NEW GENERATION STARTED ---`);
  console.log(`[Diet Gen] Target Profile:`, JSON.stringify(profile, null, 2));

  const targetCalories = calculateDailyCalories(profile);
  const recipes = await fetchRecipes();
  const archive = getCompactRecipeArchive(recipes, profile);

  const prompt = build3DayPrompt(profile, targetCalories, archive);

  try {
    const aiStart = Date.now();
    const { text, usage } = await generateText({
      model: google("gemini-2.0-flash"),
      system: "You are a clinical dietitian AI. Output ONLY a raw JSON array with exactly 3 day objects. No markdown, no commentary. Use provided slugs ONLY. Each meal slot must be an array of {slug} objects.",
      prompt,
    });
    const aiEnd = Date.now();
    
    console.log(`[Diet Gen] AI response received in ${aiEnd - aiStart}ms`);
    console.log(`[Diet Gen] Tokens Consumed: Prompt=${usage.promptTokens}, Completion=${usage.completionTokens}, Total=${usage.totalTokens}`);

    const { objects } = extractJSONObjects(text);
    console.log(`[Diet Gen] Extracted ${objects.length} day objects from response`);

    if (objects.length > 0) {
      for (const obj of objects) {
        const slotStart = Date.now();
        const hydrated = {
          day: obj.day || "Next Day",
          breakfast: validateAndConstructRecipe(obj.breakfast),
          lunch: validateAndConstructRecipe(obj.lunch),
          snack: validateAndConstructRecipe(obj.snack),
          dinner: validateAndConstructRecipe(obj.dinner),
          summary: obj.summary || "Tailored for your health goals.",
        };
        console.log(`[Diet Gen] Hydrated ${hydrated.day} in ${Date.now() - slotStart}ms`);
        yield hydrated;
      }
    }
    console.log(`[Diet Gen] --- GENERATION COMPLETE in ${Date.now() - generationStart}ms ---\n`);
  } catch (err) {
    console.error("[Diet Gen] Generation Error:", err);
  }
}

export async function getMealSwapOptions(currentRecipe, profile) {
  const recipes = await fetchRecipes();
  const archive = getCompactRecipeArchive(recipes, profile || {});

  const prompt = `
    Context: Balance Nutrition Recipe Database.
    Target: Suggest 5 alternative recipes for "${currentRecipe.name}".
    User Diet: ${profile?.dietType || "Any"}.
    
    Constraint: Choose ONLY from the valid slugs provided in the Archive below.
    Format: Return ONLY a JSON array of slugs.
    
    Archive (slug|name|cal|protein|carbs|fat|tags):
    ${archive}
  `;

  try {
    const aiStart = Date.now();
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
    });
    console.log(`[Swap AI] Options generated in ${Date.now() - aiStart}ms`);

    const { objects } = extractJSONObjects(text);
    console.log(`[Swap AI] Extracted ${objects.length} items from response`);

    // Flexible extraction: handle top-level arrays of strings/objects or objects with "slugs" key
    let slugs = [];
    if (objects.length > 0) {
      if (typeof objects[0] === 'string') {
        // AI returned ["slug1", "slug2"] which extractJSONObjects parsed into ["slug1", "slug2"]
        slugs = objects.filter(item => typeof item === 'string');
      } else if (Array.isArray(objects[0])) {
        // AI returned [ ["slug1", "slug2"] ] - rare but possible
        slugs = objects[0];
      } else if (objects[0].slugs && Array.isArray(objects[0].slugs)) {
        // AI returned { slugs: ["slug1", "slug2"] }
        slugs = objects[0].slugs;
      } else {
        // AI returned [ {slug: "slug1"}, {slug: "slug2"} ]
        slugs = objects.map(o => o.slug).filter(Boolean);
      }
    }

    return slugs.filter(s => typeof s === 'string').map(s => hydrateRecipe({ slug: s }));
  } catch (err) {
    console.error("[Swap Error]", err);
    return [];
  }
}

export async function generateSpeechAudio(text) {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY || "";
  const genai = new GoogleGenAI({ apiKey });

  try {
    const response = await genai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: `Convert this tip to natural speech: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoide" } } }
      }
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    return audioPart?.inlineData?.data || "";
  } catch (err) {
    console.error("[TTS Error]", err);
    return "";
  }
}

// ---- JSON Parser ----

function extractJSONObjects(buffer) {
  const objects = [];
  let bracketCount = 0;
  let inString = false;
  let isEscaped = false;
  let startIndex = -1;

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (isEscaped) { isEscaped = false; continue; }
    if (char === "\\") { isEscaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }

    if (!inString) {
      if (char === "{") {
        if (bracketCount === 0) startIndex = i;
        bracketCount++;
      } else if (char === "[") {
        if (bracketCount === 0) startIndex = i;
        bracketCount++;
      } else if (char === "}" || char === "]") {
        bracketCount--;
        if (bracketCount === 0 && startIndex !== -1) {
          try {
            const parsed = JSON.parse(buffer.substring(startIndex, i + 1));
            if (Array.isArray(parsed)) {
              objects.push(...parsed);
            } else {
              objects.push(parsed);
            }
          } catch (e) {
            console.warn("[JSON Parser] Failed to parse block:", e.message);
          }
          startIndex = -1;
        }
      }
    }
  }

  return { objects };
}

function parseJSONSafely(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}
