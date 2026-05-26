import { generateObject } from "ai";
import { z } from "zod";
import { google, MODEL_NAME } from "./googleProvider.js";
import { fetchRecipes } from "../recipes/recipeRepository.js";
import { hydrateRecipe } from "../nutrition/recipeHydration.js";
import { getCompactRecipeArchive } from "./recipeSelection.js";

export async function getMealSwapOptions(currentRecipe, profile) {
  const recipes = await fetchRecipes();
  const archive = await getCompactRecipeArchive(recipes, profile || {});

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
    const { object } = await generateObject({
      model: google(MODEL_NAME),
      schema: z.object({ slugs: z.array(z.string()) }),
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      topP: 0.3,
      topK: 1,
      seed: 140,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 0,
          },
        },
      },
    });

    console.log(`[Swap AI] Options generated in ${Date.now() - aiStart}ms`);
    const finalSlugs = object.slugs || [];
    console.log(`[Swap AI] Extracted ${finalSlugs.length} slugs from response`);

    return finalSlugs.map(s => hydrateRecipe({ slug: s }));
  } catch (err) {
    console.error("[Swap Error]", err);
    return [];
  }
}
