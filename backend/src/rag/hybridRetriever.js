import { embedText } from "./embedder.js";
import { bm25Index } from "./recipeIndexer.js";
import { searchEmbedding, BN_RECIPES_COLLECTION } from "../config/qdrantConfig.js";
import { rerank } from "./reranker.js";

/**
 * Performs Reciprocal Rank Fusion (RRF) to merge BM25 and Vector Search results.
 * 
 * @param {Array} bm25Results - [{ id: slug, score }]
 * @param {Array} qdrantResults - [{ payload: { slug }, score }]
 * @param {number} k - Constant for RRF (default 60)
 * @returns {Array} - [{ slug, rrfScore }]
 */
function reciprocalRankFusion(bm25Results, qdrantResults, k = 60) {
  const scores = new Map();

  bm25Results.forEach((item, idx) => {
    const slug = item.id;
    const rank = idx + 1;
    scores.set(slug, (scores.get(slug) || 0) + (1.0 / (k + rank)));
  });

  qdrantResults.forEach((item, idx) => {
    const slug = item.payload?.slug;
    if (!slug) return;
    const rank = idx + 1;
    scores.set(slug, (scores.get(slug) || 0) + (1.0 / (k + rank)));
  });

  return Array.from(scores.entries())
    .map(([slug, score]) => ({ slug, rrfScore: score }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Performs a hybrid semantic + keyword search with RRF and LLM Reranking.
 *
 * @param {string} query - The search query
 * @param {Object} recipeMap - Map/Object containing all fully hydrated recipes keyed by slug
 * @param {Object} qdrantFilter - Optional Qdrant filter object
 * @param {number} limit - Target number of results
 * @returns {Promise<Array>} - Fully hydrated and ranked recipe candidates
 */
export async function hybridSearch(query, recipeMap, qdrantFilter = null, limit = 50) {
  console.log(`\n[Hybrid Search] ==========================================`);
  console.log(`[Hybrid Search] Initiating search for query: "${query}"`);
  console.log(`[Hybrid Search] ==========================================`);

  // 1. Keyword search (BM25)
  const bm25Results = bm25Index.search(query, 100);
  console.log(`\n[Hybrid Search] --- BM25 Keyword Search Results (Top 5) ---`);
  if (bm25Results.length === 0) {
    console.log(`[BM25] No keyword matches found.`);
  } else {
    bm25Results.slice(0, 5).forEach((item, index) => {
      const match = recipeMap[item.id];
      console.log(`[BM25] [${index + 1}] Title: ${match ? match.title : item.id} | Score: ${item.score.toFixed(2)}`);
    });
  }

  // 2. Dense vector search (Qdrant)
  let qdrantResults = [];
  try {
    const queryVector = await embedText(query);
    qdrantResults = await searchEmbedding({
      collection: BN_RECIPES_COLLECTION,
      vector: queryVector,
      filter: qdrantFilter,
      limit: 100
    });
    console.log(`\n[Hybrid Search] --- Qdrant Vector Semantic Search Results (Top 5) ---`);
    if (qdrantResults.length === 0) {
      console.log(`[Qdrant] No vector matches found.`);
    } else {
      qdrantResults.slice(0, 5).forEach((item, index) => {
        console.log(`[Qdrant] [${index + 1}] Title: ${item.payload?.title || item.payload?.slug} | Cosine Score: ${item.score?.toFixed(4)}`);
      });
    }
  } catch (err) {
    console.warn("[Hybrid Search] Qdrant search failed, defaulting to BM25:", err.message);
  }

  // 3. Reciprocal Rank Fusion
  const fusedResults = reciprocalRankFusion(bm25Results, qdrantResults, 60);
  console.log(`\n[Hybrid Search] --- RRF Fused Results (Top 5) ---`);
  if (fusedResults.length === 0) {
    console.log(`[RRF] No fusion results available.`);
  } else {
    fusedResults.slice(0, 5).forEach((item, index) => {
      const match = recipeMap[item.slug];
      console.log(`[RRF] [${index + 1}] Title: ${match ? match.title : item.slug} | RRF Score: ${item.rrfScore.toFixed(4)}`);
    });
  }

  // 4. Hydrate candidates
  const candidates = fusedResults
    .map(item => recipeMap[item.slug])
    .filter(Boolean);

  if (candidates.length === 0) {
    return [];
  }

  // 5. Cross-Encoder Rerank (Top 20 candidates — reduced for token efficiency)
  const topCandidates = candidates.slice(0, 20);
  const remainingCandidates = candidates.slice(20);

  console.log(`\n[Hybrid Search] --- Reranker Input (Top 20 Candidates Sent to LLM) ---`);
  topCandidates.forEach((c, index) => {
    console.log(`[To LLM] [${index + 1}] Title: ${c.title} (${c.calories} kcal, ${c.protein}g protein, ${c.cuisine})`);
  });

  console.log(`\n[Hybrid Search] Contacting Gemini for Cross-Encoder Reranking...`);
  const reranked = await rerank(query, topCandidates);

  // 6. Assemble final results (reranked + remaining to fulfill target limit)
  const finalResults = [...reranked, ...remainingCandidates];
  
  console.log(`\n[Hybrid Search] --- Reranked Final Search Results (Top 10) ---`);
  finalResults.slice(0, 10).forEach((r, index) => {
    console.log(`[Final Match] [${index + 1}] Title: ${r.title} | RagScore: ${r.ragScore || 'N/A'}/10 | Calories: ${r.calories} kcal`);
  });
  console.log(`========================================================================\n`);

  return finalResults.slice(0, limit);
}
