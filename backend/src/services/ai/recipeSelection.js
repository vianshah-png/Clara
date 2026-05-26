import { buildSearchQuery, preFilterRecipes } from "../nutrition/recipeFilters.js";
import { recipeStore } from "../recipes/recipeRepository.js";

export async function getTieredRecipeSelection(recipes, profile) {
  const start = Date.now();
  const query = buildSearchQuery(profile);

  console.log("\n[Selector] ======================================");
  console.log(`[Selector] Built RAG query: "${query}"`);
  console.log(`[Selector] Profile: Diet=${profile.dietType}, Cuisine=${profile.cuisine}, Goal=${profile.goal}`);

  const baseValid = preFilterRecipes(recipes, profile);
  const baseValidSlugs = new Set(baseValid.map(r => r.slug));
  console.log(`[Selector] Hard-filter passed: ${baseValid.length}/${recipes.length} recipes are clinically safe`);

  let ragSelection = [];
  let ragWorked = false;
  try {
    const { hybridSearch } = await import("../../rag/hybridRetriever.js");
    const ragResults = await hybridSearch(query, recipeStore, null, 80);
    ragSelection = ragResults.filter(r => baseValidSlugs.has(r.slug));
    ragWorked = ragResults.length > 0;
  } catch (err) {
    console.error("[Selector] Hybrid search threw an error:", err.message);
  }

  console.log("\n[Selector] --- Recipe Selection Summary ---");
  if (!ragWorked) {
    console.log("[Selector] RAG: returned 0 results (BM25 index may not be ready yet or no match)");
  } else {
    console.log(`[Selector] RAG contributed:      ${ragSelection.length} recipes (semantically ranked)`);
  }
  console.log(`[Selector] = Total vault size:      ${ragSelection.length} recipes -> sent to LLM prompt`);
  console.log(`[Selector] Completed in ${Date.now() - start}ms`);
  console.log("[Selector] ======================================\n");

  return ragSelection;
}

export async function getCompactRecipeArchive(recipes, profile) {
  const selectedRecipes = await getTieredRecipeSelection(recipes, profile);

  const archiveStr = selectedRecipes.map(r => {
    const t = (r.title || "").toLowerCase();
    const s = (r.slug || "").toLowerCase();
    let cat = "ANY";
    if (
      t.includes("upma") || t.includes("poha") || t.includes("idli") || t.includes("dosa") ||
      t.includes("paratha") || t.includes("oats") || t.includes("porridge") ||
      s.includes("upma") || s.includes("poha") || s.includes("idli") || s.includes("dosa") ||
      s.includes("paratha") || s.includes("oats") || s.includes("porridge")
    ) {
      cat = "BF";
    } else if (
      t.includes("salad") || t.includes("soup") || t.includes("sprouts") ||
      s.includes("salad") || s.includes("soup") || s.includes("sprouts")
    ) {
      cat = "S";
    } else if (
      t.includes("rice") || t.includes("dal") || t.includes("sabzi") ||
      t.includes("curry") || t.includes("roti") || t.includes("chapati") ||
      s.includes("rice") || s.includes("dal") || s.includes("sabzi") ||
      s.includes("curry") || s.includes("roti") || s.includes("chapati")
    ) {
      cat = "L/D";
    }
    return `${r.slug}|${r.title}|${r.calories}|${Math.round(r.protein)}|${Math.round(r.carbs)}|${Math.round(r.fat)}|${cat}`;
  }).join("\n");

  const estTokens = Math.ceil(archiveStr.length / 4);
  console.log(`\n[Vault] --- Compact Recipe Vault Sent in the Prompt to LLM (Top 10 / ${selectedRecipes.length} total) ---`);
  selectedRecipes.slice(0, 10).forEach((r, index) => {
    console.log(`[Vault Item ${index + 1}] ${r.slug} | ${r.title} | ${r.calories} cal | P: ${Math.round(r.protein)}g | C: ${Math.round(r.carbs)}g | F: ${Math.round(r.fat || r.fats || 0)}g`);
  });
  console.log(`[Vault] Total archive characters: ${archiveStr.length}, estimated tokens: ~${estTokens}\n`);

  return archiveStr;
}
