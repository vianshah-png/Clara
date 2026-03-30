import fs from 'fs';
import path from 'path';

const API_URL = "https://bn-new-api.balancenutritiononline.com/api/v1/recipe/all";
const OUTPUT_FILE = path.join(process.cwd(), 'backend', 'data', 'recipeData.js');

async function sync() {
  console.log("Fetching recipes from BN API...");
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
    });
    const json = await res.json();
    const data = Array.isArray(json) ? json[0] : json;
    const recipes = data.data || [];

    if (recipes.length === 0) {
      console.error("No recipes found in API response.");
      return;
    }

    const cleaned = recipes.map(r => ({
      title: r.title,
      slug: r.slug,
      category: r.category,
      sub_category: r.sub_category,
      cuisine: r.cuisine,
      recipe_type: r.recipe_type,
      ingredients: r.ingredients || [],
      calories: r.meta_data?.energy || r.meta_data?.calories || 0,
      protein: r.meta_data?.protein || 0,
      fat: r.meta_data?.fat || 0,
      carbs: r.meta_data?.carbs || 0,
      fiber: r.meta_data?.fiber || 0,
      method: r.meta_data?.method || []
    }));

    const fileContent = `export const recipes = ${JSON.stringify(cleaned, null, 2)};\n`;
    fs.writeFileSync(OUTPUT_FILE, fileContent);
    console.log(`Successfully synced ${cleaned.length} recipes to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Sync failed:", err.message);
  }
}

sync();
