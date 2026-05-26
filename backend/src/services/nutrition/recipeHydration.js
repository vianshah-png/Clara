import { recipeStore } from "../recipes/recipeRepository.js";

function inferPortionUnit(recipe) {
  const text = `${recipe.title || ""} ${recipe.slug || ""} ${recipe.category || ""}`.toLowerCase();

  if (text.includes("roti") || text.includes("chapati") || text.includes("paratha") || text.includes("dosa") || text.includes("idli")) {
    return "piece";
  }
  if (text.includes("juice") || text.includes("smoothie") || text.includes("tea") || text.includes("coffee") || text.includes("water")) {
    return "glass";
  }
  if (text.includes("soup") || text.includes("dal") || text.includes("curry") || text.includes("khichdi") || text.includes("rice") || text.includes("upma") || text.includes("poha")) {
    return "bowl";
  }
  if (text.includes("raita") || text.includes("curd") || text.includes("yogurt") || text.includes("dip") || text.includes("chutney")) {
    return "katori";
  }
  if (text.includes("salad") || text.includes("sabzi") || text.includes("sprouts")) {
    return "serving bowl";
  }
  if (text.includes("butter") || text.includes("spread") || text.includes("ghee")) {
    return "spoon";
  }

  return "portion";
}

function formatServingSize(recipe, servings) {
  const rawServing = recipe.serving_size && String(recipe.serving_size).trim();
  const unit = inferPortionUnit(recipe);
  const count = Number(servings) || 1;
  const unitLabel = count === 1 ? unit : `${unit}s`;
  const base = rawServing || `1 ${unit}`;

  if (count !== 1) {
    return `${count} ${unitLabel} (${count}x ${base})`;
  }

  if (/bowl|glass|piece|roti|katori|spoon|portion|serving/i.test(base)) {
    return base;
  }

  return `1 ${unit} (${base})`;
}

export function hydrateRecipe(aiRecipe) {
  const slug = aiRecipe.slug;
  const servings = aiRecipe.servings || 1;
  const storeMatch = recipeStore[slug];

  if (!storeMatch) {
    return {
      name: aiRecipe.name || "Custom Suggested Meal",
      url: "#",
      calories: (Number(aiRecipe.calories) || 0) * servings,
      protein: 0,
      carbs: 0,
      fats: 0,
      description: "Based on dietary preferences",
      servingSize: servings !== 1 ? `${servings} portions` : "1 portion",
      ingredients: [],
      instructions: [],
    };
  }

  return {
    name: servings !== 1 ? `${storeMatch.title} (x${servings})` : storeMatch.title,
    url: storeMatch.url || `https://www.balancenutrition.in/recipes/${encodeURIComponent(storeMatch.category || "All")}/${storeMatch.slug}`,
    calories: (Number(storeMatch.calories) || 0) * servings,
    protein: (Number(storeMatch.protein) || 0) * servings,
    carbs: (Number(storeMatch.carbs) || 0) * servings,
    fats: (Number(storeMatch.fat) || 0) * servings,
    description: storeMatch.recipe_type || "",
    servingSize: formatServingSize(storeMatch, servings),
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
