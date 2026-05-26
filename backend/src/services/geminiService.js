// Compatibility facade for the Express routes.
// The implementation now lives in focused backend services.

export { serviceConfig } from "./config/serviceConfig.js";
export { fetchRecipes, recipeStore } from "./recipes/recipeRepository.js";
export { fetchUserProfile } from "./profile/profileService.js";
export { fetchShopProducts, findShopAlternatives, getQuickFillers } from "./shop/shopService.js";
export {
  calculateDailyCalories,
  calculateBMI,
  calculateMacros,
} from "./nutrition/calculations.js";
export {
  hydrateRecipe,
  validateAndConstructRecipe,
} from "./nutrition/recipeHydration.js";
export { generateMealPlanStream } from "./ai/mealPlanService.js";
export { getMealSwapOptions } from "./ai/swapService.js";
export { generateSpeechAudio } from "./ai/speechService.js";
