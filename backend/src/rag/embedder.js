import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const EMBEDDING_MODEL_NAME = "gemini-embedding-2";

export async function embedText(text) {
  if (!text) return new Array(768).fill(0);
  try {
    const { embedding } = await embed({
      model: google.textEmbeddingModel(EMBEDDING_MODEL_NAME),
      value: text,
      outputDimensionality: 768, // Match Qdrant schema
    });
    return embedding; // float[768]
  } catch (err) {
    console.error("[Embedder] Error embedding single text using gemini-embedding-2:", err);
    throw err;
  }
}

export async function embedBatch(texts) {
  if (!texts || texts.length === 0) return [];
  try {
    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel(EMBEDDING_MODEL_NAME),
      values: texts,
      outputDimensionality: 768, // Match Qdrant schema
    });
    return embeddings; // float[768][]
  } catch (err) {
    console.error(`[Embedder] Error embedding batch of size ${texts.length} using gemini-embedding-2:`, err);
    throw err;
  }
}
