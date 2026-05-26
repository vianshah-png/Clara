import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Reranks candidate recipes based on how well they match the search query / profile details.
 * Processes candidates in a single batch prompt to Gemini for maximum efficiency.
 *
 * @param {string} query - The search query / target profile details
 * @param {Array} candidates - Array of full recipe objects
 * @returns {Promise<Array>} - Sorted array of candidates with scores
 */
export async function rerank(query, candidates) {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length === 1) return candidates;

  const prompt = `You are a clinical dietitian search assistant.
Rate the relevance of each candidate recipe below to the search query on a scale from 0 to 10 (10 being perfect match, 0 being completely irrelevant).

Search Query: "${query}"

Candidate Recipes:
${candidates.map((r, idx) => {
  return `[Candidate ${idx}]
Slug: ${r.slug}
Title: ${r.title}
Category: ${r.category || ""}
Cuisine: ${r.cuisine || ""}
Recipe Type: ${r.recipe_type || ""}
Calories: ${r.calories || r.energy || 0} kcal
Protein: ${r.protein || 0}g
Carbs: ${r.carbs || 0}g
Fat: ${r.fat || 0}g
Health Tags: ${(r.health_tags || []).join(", ")}
Nutrient Tags: ${(r.nutrient_tags || []).join(", ")}
`;
}).join("\n---\n")}

Rating Guidelines:
1. Strict Safety: If the query specifies an allergy/aversion or diet restriction (e.g. Vegetarian) and the recipe violates it, rate it 0.
2. Nutritional Fit: Match calories and macros to any query preferences.
3. Relevance: Match the ingredients, meal type (breakfast, lunch, etc.), and style of food.

Provide your ratings as a JSON object containing a 'scores' array matching the schema.`;

  try {
    const { object } = await generateObject({
      model: google(MODEL_NAME),
      schema: z.object({
        scores: z.array(z.object({
          slug: z.string(),
          score: z.number().min(0).max(10),
          reason: z.string()
        }))
      }),
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 0,
          },
        }
      }
    });

    const scoreMap = new Map();
    console.log(`\n[Reranker] --- Reranker Scores (from Gemini) ---`);
    (object.scores || []).forEach((item, index) => {
      scoreMap.set(item.slug, item.score);
      const match = candidates.find(c => c.slug === item.slug);
      console.log(`[Reranker] [${index + 1}] Title: "${match ? match.title : item.slug}" | Score: ${item.score}/10`);
      console.log(`           Reason: ${item.reason}`);
    });

    // Attach scores to original candidates and sort
    const reranked = candidates.map(c => {
      const score = scoreMap.has(c.slug) ? scoreMap.get(c.slug) : 5.0; // default middle score
      return { ...c, ragScore: score };
    });

    reranked.sort((a, b) => b.ragScore - a.ragScore);
    console.log(`\n[Reranker] Successfully scored and sorted ${candidates.length} candidates.`);
    return reranked;
  } catch (err) {
    console.error("[Reranker] Error during reranking, returning original order:", err);
    return candidates;
  }
}
