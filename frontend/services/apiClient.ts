// ============================================================
//  API Client Service (Frontend)
//  Handles all HTTP + SSE communication with the Express Backend
// ============================================================

import { UserProfile, DailyPlan, Recipe } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * Stream a 3-day meal plan from the backend via SSE.
 * Robust SSE parser that handles chunked/split data lines.
 */
export async function generateMealPlanStream(
  profile: UserProfile,
  onDayGenerated: (day: DailyPlan) => void
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/generate-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    console.error("[SSE] Non-OK response:", response.status, errorBody);
    throw new Error(`Failed to generate plan: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No readable stream available");
  }

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    console.debug("[SSE] Raw Chunk Received:", chunk.substring(0, 100).replace(/\n/g, '\\n'));
    buffer += chunk;

    // SSE events are separated by double newlines
    // Process complete events from the buffer
    let eventEnd: number;
    while ((eventEnd = buffer.indexOf("\n\n")) !== -1) {
      const eventBlock = buffer.substring(0, eventEnd).trim();
      buffer = buffer.substring(eventEnd + 2);

      if (!eventBlock) continue;

      // Extract the data payload from all "data: " lines in this event block
      const dataLines = eventBlock
        .split("\n")
        .filter((line: string) => line.startsWith("data: "))
        .map((line: string) => line.substring(6)); // Remove "data: " prefix

      if (dataLines.length === 0) continue;

      const dataStr = dataLines.join("").trim();

      if (dataStr === "[DONE]") {
        return; // Stream complete
      }

      if (!dataStr) continue;

      try {
        const payload = JSON.parse(dataStr);
        if (payload.status) {
          console.debug("[SSE] Status update received:", payload.status);
          continue;
        }
        if (payload.error) {
          console.error("[SSE] Server error payload received:", payload.error);
          throw new Error(payload.error);
        }
        if (payload.day) {
          onDayGenerated(payload);
        }
      } catch (e: any) {
        // Only warn for real parsing issues, ignore the specific SSE termination/errors we already handled
        if (e.message && !e.message.includes("No recipes found")) {
          console.warn("[SSE] Parse error or missing day property:", e.message, "Content:", dataStr.substring(0, 50));
        }
      }
    }
  }

  // Process any remaining buffer content after stream ends
  if (buffer.trim()) {
    const remaining = buffer.trim();
    if (remaining.startsWith("data: ")) {
      const dataStr = remaining.substring(6).trim();
      if (dataStr && dataStr !== "[DONE]") {
        try {
          const dayPlan = JSON.parse(dataStr);
          if (!dayPlan.error) {
            onDayGenerated(dayPlan);
          }
        } catch (e) {
          console.warn("[SSE] Final chunk parse warning:", remaining.substring(0, 100));
        }
      }
    }
  }
}


/**
 * Get swap alternatives for a meal.
 */
export async function getMealSwapOptions(
  currentRecipe: Recipe,
  profile: UserProfile
): Promise<Recipe[]> {
  const res = await fetch(`${API_BASE_URL}/swap-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentRecipe, userProfile: profile }),
  });

  if (!res.ok) throw new Error("Failed to get swap options");
  return res.json();
}

/**
 * Generate speech (TTS) from text and return base64 audio.
 */
export async function generateSpeechFromBackend(text: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/generate-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error("Failed to generate speech");
  const data = await res.json();
  return data.audioData;
}

export interface ShopAlternative {
  original: string;
  alternative: string;
  category: string;
  shopUrl: string;
  image?: string;
  price?: number;
}

/**
 * Get healthy alternatives for shopping basket items from BN Shop
 */
export async function getShopAlternatives(basketItems: string[]): Promise<ShopAlternative[]> {
  const res = await fetch(`${API_BASE_URL}/shop-alternatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ basketItems }),
  });

  if (!res.ok) throw new Error("Failed to get shop alternatives");
  return res.json();
}

// ----------------------------------------------------
// Keep the decode function on frontend since it uses AudioContext
// ----------------------------------------------------
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Fetch all available recipes from the backend library.
 */
export async function getAllRecipes(): Promise<Recipe[]> {
  const res = await fetch(`${API_BASE_URL}/recipes`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) throw new Error("Failed to fetch recipes");
  const json = await res.json();
  return json.data || [];
}
