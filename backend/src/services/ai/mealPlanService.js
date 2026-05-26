import { generateObject } from "ai";
import { z } from "zod";
import { google, MODEL_NAME } from "./googleProvider.js";
import { fetchRecipes } from "../recipes/recipeRepository.js";
import { calculateBMI, calculateDailyCalories, calculateMacros } from "../nutrition/calculations.js";
import { validateAndConstructRecipe } from "../nutrition/recipeHydration.js";
import { getCompactRecipeArchive } from "./recipeSelection.js";
import { build3DayPrompt } from "./promptBuilder.js";

const mealPlanSchema = z.object({
  days: z.array(z.object({
    day: z.string(),
    breakfast: z.array(z.object({
      optionLabel: z.string(),
      items: z.array(z.object({ slug: z.string(), servings: z.number().optional() })),
    })),
    lunch: z.array(z.object({
      optionLabel: z.string(),
      items: z.array(z.object({ slug: z.string(), servings: z.number().optional() })),
    })),
    snack: z.array(z.object({ slug: z.string(), servings: z.number().optional() })),
    dinner: z.array(z.object({
      optionLabel: z.string(),
      items: z.array(z.object({ slug: z.string(), servings: z.number().optional() })),
    })),
    summary: z.string(),
  })),
});

export async function* generateMealPlanStream(profile) {
  const generationStart = Date.now();
  console.log("\n[Diet Gen] --- NEW GENERATION STARTED ---");
  console.log("[Diet Gen] Target Profile:", JSON.stringify(profile, null, 2));

  const targetCalories = calculateDailyCalories(profile);
  const { bmi, bmiClass } = calculateBMI(profile);
  const macros = calculateMacros(targetCalories, bmi, profile.goal);
  console.log(`[Diet Gen] BMI: ${bmi} (${bmiClass}) | Target: ${targetCalories} kcal`);
  console.log(`[Diet Gen] Macros -> Protein: ${macros.proteinG}g | Carbs: ${macros.carbsG}g | Fat: ${macros.fatsG}g`);

  const recipes = await fetchRecipes();
  const archive = await getCompactRecipeArchive(recipes, profile);
  const prompt = build3DayPrompt(profile, targetCalories, bmi, bmiClass, macros, archive);

  try {
    const aiStart = Date.now();
    const { object, usage } = await generateObject({
      model: google(MODEL_NAME),
      schema: mealPlanSchema,
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

    console.log(`[Diet Gen] AI response received in ${Date.now() - aiStart}ms`);
    console.log(`[Diet Gen] Tokens Consumed: Prompt=${usage.promptTokens}, Completion=${usage.completionTokens}, Total=${usage.totalTokens}`);

    const days = object.days || [];
    console.log(`[Diet Gen] Extracted ${days.length} day objects from response`);

    for (const obj of days) {
      const slotStart = Date.now();
      const hydrateOption = (opt) => ({
        optionLabel: opt.optionLabel,
        items: validateAndConstructRecipe(opt.items),
      });

      const hydrated = {
        day: obj.day || "Next Day",
        breakfast: (obj.breakfast || []).map(hydrateOption),
        lunch: (obj.lunch || []).map(hydrateOption),
        snack: validateAndConstructRecipe(obj.snack),
        dinner: (obj.dinner || []).map(hydrateOption),
        summary: obj.summary || "Tailored for your health goals.",
      };
      console.log(`[Diet Gen] Hydrated ${hydrated.day} in ${Date.now() - slotStart}ms`);

      const allDayRecipes = [
        ...hydrated.breakfast.flatMap(opt => opt.items || []),
        ...hydrated.lunch.flatMap(opt => opt.items || []),
        ...(Array.isArray(hydrated.snack) ? hydrated.snack : [hydrated.snack]),
        ...hydrated.dinner.flatMap(opt => opt.items || []),
      ].filter(Boolean);
      const actualCals = allDayRecipes.reduce((s, r) => s + (r?.calories || 0), 0);
      const actualProt = allDayRecipes.reduce((s, r) => s + (r?.protein || 0), 0);
      const calDiff = Math.abs(actualCals - targetCalories);
      const valStatus = calDiff > 200 ? "WARNING >200 kcal deviation" : "Within tolerance";
      console.log(`[Validation] ${hydrated.day}: Actual=${actualCals} kcal (target=${targetCalories}) | ${valStatus} | Protein=${Math.round(actualProt)}g`);

      yield hydrated;
    }

    console.log(`[Diet Gen] --- GENERATION COMPLETE in ${Date.now() - generationStart}ms ---\n`);
  } catch (err) {
    console.error("[Diet Gen] Generation Error:", err);
  }
}
