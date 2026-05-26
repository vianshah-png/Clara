import { serviceConfig, CACHE_TTL } from "../config/serviceConfig.js";

export const recipeStore = {};
let lastFetchTime = 0;
let staticFallback = [];

async function rebuildRecipeIndex() {
  const { indexRecipes } = await import("../../rag/recipeIndexer.js");
  indexRecipes(Object.values(recipeStore)).catch(err => {
    console.error("[Indexer Background Error]", err);
  });
}

function normalizeLiveRecipe(r) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    category: r.category,
    sub_category: r.sub_category,
    cuisine: r.cuisine,
    recipe_type: r.recipe_type,
    ingredients: r.ingredients || [],
    image: r.recipe_thumbnail_images?.[0]?.file?.path || r.recipe_icon?.[0]?.file?.path || r.image || r.thumbnail || "",
    url: r.url || (r.slug ? `https://www.balancenutrition.in/recipes/${encodeURIComponent(r.category || "All")}/${r.slug}` : ""),
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
    serving_size: r.meta_data?.serving_size || r.meta_data?.portion_size || r.meta_data?.servingSize || "",
  };
}

async function loadFallbackRecipes() {
  try {
    const mod = await import("../../data/recipeData.js");
    staticFallback = mod.recipes;
    staticFallback.forEach(r => {
      if (!r.url && r.slug) {
        r.url = `https://www.balancenutrition.in/recipes/${encodeURIComponent(r.category || "All")}/${r.slug}`;
      }
      if (!recipeStore[r.slug]) recipeStore[r.slug] = r;
    });
    console.log(`[Cache] Pre-loaded ${staticFallback.length} fallback recipes`);
    rebuildRecipeIndex();
  } catch (err) {
    console.warn("[Cache] No fallback recipeData file found.", err);
  }
}

loadFallbackRecipes();

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
      method: "POST",
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const json = await res.json();
    console.log(`[Sync] Recipe API response received in ${Date.now() - fetchStart}ms`);
    const data = Array.isArray(json) ? json[0] : json;
    const recipes = data.data || [];

    if (recipes.length > 0) {
      console.log(`[Sync] Sample recipe keys: ${Object.keys(recipes[0]).join(", ")}`);
      recipes.forEach((r) => {
        recipeStore[r.slug] = normalizeLiveRecipe(r);
      });
      lastFetchTime = now;
      console.log(`[BN API] Refreshed store: ${Object.keys(recipeStore).length} recipes total`);
      rebuildRecipeIndex();
      return Object.values(recipeStore);
    }
  } catch (err) {
    console.error(`[BN API] Live Sync ERROR: ${err.message}`, err);
    console.warn("[BN API] Sync failed, using available store:", err.message);
  }

  return Object.values(recipeStore);
}
