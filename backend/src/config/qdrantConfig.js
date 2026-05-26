import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";
dotenv.configDotenv();

const qdrantConfig = { url: process.env.QDRANT_URL };
if (process.env.QDRANT_API_KEY) {
  qdrantConfig.apiKey = process.env.QDRANT_API_KEY;
}
const client = new QdrantClient(qdrantConfig);

const BN_RECIPES_COLLECTION = process.env.QDRANT_COLLECTION || 'bn_recipes';

async function storeEmbedding({ id, embedding, metadata, collection }) {
  try {
    const result = await client.upsert(collection, {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload: metadata,
        },
      ],
    });
  } catch (error) {
    console.error("Error storing embedding:", error);
  }
}

async function ensureCollection({ name, size = 768, distance = 'Cosine' }) {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === name);
    if (!exists) {
      await client.createCollection(name, {
        vectors: { size, distance },
      });
      console.log(`✅ Created Qdrant collection: ${name} (dim=${size}, dist=${distance})`);
    } else {
      console.log(`ℹ️ Qdrant collection '${name}' already exists`);
    }
  } catch (error) {
    console.error(`Error ensuring collection '${name}':`, error);
    throw error;
  }
}

async function searchEmbedding({ collection, vector, filter, limit = 10 }) {
  try {
    const searchParams = {
      vector,
      limit,
      with_payload: true,
    };
    if (filter) {
      searchParams.filter = filter;
    }
    const results = await client.search(collection, searchParams);
    return results;
  } catch (error) {
    console.error(`Error searching collection '${collection}':`, error);
    throw error;
  }
}

async function deletePoint({ collection, id }) {
  try {
    await client.delete(collection, {
      wait: true,
      points: [id],
    });
  } catch (error) {
    console.error(`Error deleting point ${id} from '${collection}':`, error);
  }
}

async function upsertBatch({ collection, points }) {
  try {
    const result = await client.upsert(collection, {
      wait: true,
      points,
    });
    console.log(`📦 Upserted ${points.length} points to '${collection}'`);
    return result;
  } catch (error) {
    console.error(`Error batch upserting to '${collection}':`, error);
    throw error;
  }
}

export { client, storeEmbedding, BN_RECIPES_COLLECTION, ensureCollection, searchEmbedding, deletePoint, upsertBatch };
