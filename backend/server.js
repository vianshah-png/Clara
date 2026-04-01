// ============================================================
//  Clara AI — Express Backend Server (Pure JavaScript)
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  generateMealPlanStream,
  getMealSwapOptions,
  generateSpeechAudio,
  fetchUserProfile,
  fetchRecipes,
  serviceConfig,
  findShopAlternatives,
} from "./geminiService.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ---- Middleware ----
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ---- Health Check ----
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "clara-ai-backend" });
});

// ---- Route 1: Generate Meal Plan (SSE) ----
app.post("/api/generate-plan", async (req, res) => {
  let profile = req.body;
  const userId = req.body?.user_id;

  try {
    console.log(`[Flow] Starting generation pipeline for user...`);
    if (userId) {
      const pStart = Date.now();
      profile = await fetchUserProfile(userId.toString());
      console.log(`[Data] Profile fetched in ${Date.now() - pStart}ms`);
      console.log(`[Data] Profile keys: ${Object.keys(profile).join(', ')}`);
    }

    if (!profile?.age || !profile?.weight || !profile?.gender) {
      console.error(`[Validation] Missing required fields. age=${profile?.age}, weight=${profile?.weight}, gender=${profile?.gender}`);
      return res.status(400).json({ error: "Missing required profile fields" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // SSE Comment-based keep-alive to prevent middleware/proxy timeouts
    res.write(":\n\n");
    
    // Send initial status ping
    res.write(`data: {"status": "starting"}\n\n`);

    const sStart = Date.now();
    let emitted = false;
    let dayCount = 0;
    console.log(`[Stream] SSE Connection Opened. Beginning background generation...`);

    for await (const day of generateMealPlanStream(profile)) {
      if (day.error) {
        console.warn(`[Stream] AI returned error: ${day.error}`);
        res.write(`data: ${JSON.stringify({ error: day.error })}\n\n`);
        continue;
      }
      res.write(`data: ${JSON.stringify(day)}\n\n`);
      emitted = true;
      dayCount++;
      console.log(`[Stream] Day ${dayCount} emitted (${Date.now() - sStart}ms total elapsed)`);
    }

    if (!emitted) {
      console.warn(`[Stream] No days were emitted. Closing with error.`);
      res.write(`data: ${JSON.stringify({ error: "No recipes found matching current preferences." })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("[Stream Error]", err);
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ---- Route 2: Meal Swaps ----
app.post("/api/swap-options", async (req, res) => {
  const { currentRecipe, userProfile } = req.body;
  if (!currentRecipe || !userProfile) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const options = await getMealSwapOptions(currentRecipe, userProfile);
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: "Swap failed" });
  }
});

// ---- Route 3: TTS ----
app.post("/api/generate-speech", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const audioData = await generateSpeechAudio(text);
    res.json({ audioData });
  } catch (err) {
    res.status(500).json({ error: "TTS failed" });
  }
});

// ---- Management ----
app.get("/api/config", (req, res) => res.json(serviceConfig));

app.post("/api/config", (req, res) => {
  const { useMockData } = req.body;
  if (typeof useMockData === "boolean") serviceConfig.useMockData = useMockData;
  res.json({ success: true, config: serviceConfig });
});

app.get("/api/upstream-status", async (req, res) => {
  const status = { recipe_api: "offline", client_api: "offline", gemini_api: "online" };
  try {
    const r = await fetch(serviceConfig.bnRecipeApi, { method: 'POST', signal: AbortSignal.timeout(2000) });
    status.recipe_api = r.ok ? "online" : `error: ${r.status}`;
  } catch (e) {}

  try {
    const c = await fetch(serviceConfig.bnClientApi, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
    status.client_api = c.ok ? "online" : `error: ${c.status}`;
  } catch (e) {}
  res.json({ success: true, status });
});

app.get("/api/recipes", async (req, res) => {
  try {
    const recipes = await fetchRecipes();
    res.json({ success: true, count: recipes.length, data: recipes });
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ---- Route 4: Shop Alternatives ----
app.post("/api/shop-alternatives", async (req, res) => {
  const { basketItems } = req.body;
  if (!basketItems || !Array.isArray(basketItems)) {
    return res.status(400).json({ error: "Missing basketItems array" });
  }

  try {
    const alternatives = await findShopAlternatives(basketItems);
    res.json(alternatives);
  } catch (err) {
    console.error("[Shop Alternatives Error]", err);
    res.status(500).json({ error: "Failed to fetch shop alternatives" });
  }
});

// ---- Route 5 (Removed Scraper) ----

// ---- Launch ----
app.listen(PORT, () => {
  console.log(`Clara AI Backend (JS) running on :${PORT}`);
});
