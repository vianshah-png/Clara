import crypto from "crypto";
import { 
  client as qdrantClient, 
  ensureCollection, 
  upsertBatch, 
  BN_RECIPES_COLLECTION 
} from "../config/qdrantConfig.js";
import { embedBatch } from "./embedder.js";
import { BM25Index } from "./bm25.js";

export const bm25Index = new BM25Index();

// Simple helper to create a string hash
function getHash(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

/**
 * Builds the search text representation for a recipe
 */
export function buildRecipeText(r) {
  const ingredientsStr = Array.isArray(r.ingredients) 
    ? r.ingredients.map(i => i.name || i).join(", ") 
    : "";
  const healthTagsStr = Array.isArray(r.health_tags) ? r.health_tags.join(", ") : "";
  const nutrientTagsStr = Array.isArray(r.nutrient_tags) ? r.nutrient_tags.join(", ") : "";
  
  return `${r.title || ""} | ${r.category || ""} | ${r.cuisine || ""} | ${r.recipe_type || ""} | Ingredients: ${ingredientsStr} | Health Tags: ${healthTagsStr} | Nutrient Tags: ${nutrientTagsStr} | ${r.calories || r.energy || 0} cal, ${Math.round(r.protein || 0)}g protein, ${Math.round(r.carbs || 0)}g carbs, ${Math.round(r.fat || r.fats || 0)}g fat`;
}

/**
 * Indexes all recipes into BM25 (in-memory) and Qdrant (dense vector).
 * Employs caching logic to avoid redundant Gemini embedding calls.
 * Does not crash if Qdrant is offline.
 *
 * IMPORTANT: No isIndexed guard — we always rebuild BM25 when called.
 * This ensures the live API sync (1,327 recipes) properly overwrites 
 * the initial static fallback index (1,315 recipes).
 *
 * @param {Array} recipes - Full list of normalized recipe objects
 */
export async function indexRecipes(recipes) {
  const startTime = Date.now();
  console.log(`\n[Indexer] ======================================`);
  console.log(`[Indexer] Rebuilding BM25 index for ${recipes.length} recipes...`);

  // 1. Always rebuild the in-memory BM25 index (super fast, < 100ms)
  bm25Index.invertedIndex.clear();
  bm25Index.docLengths.clear();
  bm25Index.docCount = 0;
  
  recipes.forEach(r => {
    const text = buildRecipeText(r);
    bm25Index.addDocument(r.slug, text);
  });
  bm25Index.build();
  console.log(`[Indexer] ✓ BM25 index ready: ${bm25Index.docCount} documents in ${Date.now() - startTime}ms.`);

  // 2. Qdrant dense vector indexing
  let qdrantConnected = false;
  try {
    await ensureCollection({ name: BN_RECIPES_COLLECTION, size: 768, distance: "Cosine" });
    qdrantConnected = true;
    console.log(`[Indexer] ✓ Qdrant connected.`);
  } catch (err) {
    console.warn(`[Indexer] ✗ Qdrant offline: ${err.message}`);
    console.warn(`[Indexer]   → Active Mode: BM25 KEYWORD-ONLY (no semantic vector search)`);
    console.warn(`[Indexer]   → To enable full hybrid: start Docker Compose with Qdrant.`);
    console.log(`[Indexer] ======================================\n`);
  }

  if (qdrantConnected) {
    try {
      let existingPointsCount = 0;
      try {
        const collectionInfo = await qdrantClient.getCollection(BN_RECIPES_COLLECTION);
        existingPointsCount = collectionInfo.points_count || 0;
      } catch (err) {
        console.warn("[Indexer] Failed to query existing point count:", err.message);
      }

      if (existingPointsCount >= recipes.length - 100 && existingPointsCount > 0) {
        console.log(`[Indexer] ✓ Qdrant already has ${existingPointsCount} vectors (matches ${recipes.length} recipes). Skipping re-embedding.`);
        console.log(`[Indexer]   → Active Mode: FULL HYBRID RAG (BM25 + Qdrant vectors + Gemini reranker)`);
        console.log(`[Indexer] ======================================\n`);
        return;
      }

      console.log(`[Indexer] Qdrant has ${existingPointsCount} vectors but recipe count is ${recipes.length}. Starting re-embedding...`);

      const batchSize = 50;
      let newlyIndexed = 0;

      for (let i = 0; i < recipes.length; i += batchSize) {
        const chunk = recipes.slice(i, i + batchSize);
        const texts = chunk.map(buildRecipeText);

        try {
          const embeddings = await embedBatch(texts);

          const points = chunk.map((r, idx) => {
            const id = crypto.createHash("md5").update(r.slug).digest("hex")
              .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
            
            return {
              id,
              vector: embeddings[idx],
              payload: {
                slug: r.slug,
                title: r.title,
                category: r.category || "",
                cuisine: r.cuisine || "",
                recipe_type: r.recipe_type || "",
                calories: Number(r.calories || r.energy || 0),
                protein: Number(r.protein || 0),
                carbs: Number(r.carbs || 0),
                fat: Number(r.fat || r.fats || 0),
                textHash: getHash(texts[idx])
              }
            };
          });

          await upsertBatch({ collection: BN_RECIPES_COLLECTION, points });
          newlyIndexed += chunk.length;
          console.log(`[Indexer] Progress: ${newlyIndexed}/${recipes.length} recipes vector-indexed...`);
        } catch (embedError) {
          console.error(`[Indexer] Failed indexing batch at ${i}:`, embedError.message);
        }
      }

      console.log(`[Indexer] ✓ Qdrant vector-indexing done in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
      console.log(`[Indexer]   → Active Mode: FULL HYBRID RAG (BM25 + Qdrant vectors + Gemini reranker)`);
    } catch (err) {
      console.error("[Indexer] Qdrant vector indexing crashed:", err);
    }
    console.log(`[Indexer] ======================================\n`);
  }
}
