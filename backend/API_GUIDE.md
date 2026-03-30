# Clara AI — API Documentation Reference

This document provides a technical overview of the microservice endpoints, data flow, and management controls.

## 1. Core Endpoints (Microservice Entry Points)

### `POST /api/generate-plan`
Generates a 7-day personalized meal plan based on user profile.
- **Input**: `UserProfile` object or `{ "user_id": "..." }`.
- **Response**: Server-Sent Events (SSE) stream of `DailyPlan` objects.
- **Example**: `curl -X POST -H "Content-Type: application/json" -d '{"user_id":"123"}' http://localhost:3001/api/generate-plan`

### `POST /api/swap-options`
Suggests 5 healthy alternatives for a specific recipe.
- **Input**: `{ "currentRecipe": Recipe, "userProfile": UserProfile }`
- **Response**: Array of 5 `Recipe` objects.

### `POST /api/generate-speech`
Converts health tips or summary texts to audio.
- **Input**: `{ "text": "..." }`
- **Response**: `{ "audioData": "base64_encoded_pcm_data" }`

---

## 2. Management & Orchestration Endpoints

### `GET /api/health`
Basic service availability check.
- **Response**: `{ "status": "ok", "service": "clara-ai-backend" }`

### `GET /api/upstream-status`
Checks connectivity to external Balance Nutrition APIs (Recipe & Client).
- **Response**: Detailed status of each upstream dependency.

### `GET /api/config`
Retrieves current microservice configuration.
- **Response**: Current settings for mock mode, API URLs, etc.

### `POST /api/config`
Dynamically toggles microservice behavior.
- **Input**: `{ "useMockData": true/false }`
- **Response**: Updated configuration status.

---

## 3. Data Flow Orchestration
1. **Request Received**: Entry point validates payload.
2. **Profile Resolution**: If `user_id` is present, it calls the **BN Client API**.
3. **Recipe Retrieval**: Fetches all available recipes from the **BN Recipe API**.
4. **AI Generation**: Filters recipes, builds prompt, and interacts with **Gemini 1.5 Flash**.
5. **Post-Processing**: Validates and transforms AI output into the final UI-ready schema.
