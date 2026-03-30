
import { fetchRecipes, calculateDailyCalories } from './backend/geminiService.js';
import { recipes as staticRecipes } from './backend/data/recipeData.js';

// Mocking preFilterRecipes and others since they are not exported
// I'll just import the whole service and test the public-facing archive generation indirectly
// Actually, I can just copy the functions for a quick test if they aren't exported.
// But they ARE in the same file. I'll make a temporary change to export them or just test via a dummy call to something that uses it.

// Let's just create a standalone test that mimics the logic I just wrote.

const profile = {
    dietType: "Vegetarian",
    cuisine: "North Indian",
    allergies: "None",
    aversions: "Mushrooms",
    weight: "70",
    height: "170",
    age: "30",
    gender: "Male",
    activityLevel: "Sedentary",
    goal: "Weight Loss"
};

const targetCalories = 2000; // Simplified
const cuisinePref = "north indian";

function preFilterRecipes(recipes, profile) {
  const isVeg = profile.dietType?.toLowerCase().includes("veg") && !profile.dietType?.toLowerCase().includes("non");
  const filtered = recipes.filter(r => {
    if (!r.calories || r.calories === 0) return false;
    if (isVeg && r.recipe_type?.toLowerCase().includes("non-veg")) return false;
    return true;
  });
  return filtered;
}

const baseValid = preFilterRecipes(staticRecipes, profile);
const relevant = baseValid.filter(r => r.calories >= 30 && r.calories <= 800);
const tier1 = relevant.filter(r => r.cuisine?.toLowerCase().includes(cuisinePref));
const other = relevant.filter(r => !r.cuisine?.toLowerCase().includes(cuisinePref));

let selection = tier1.slice(0, 250); 
if (selection.length < 350) {
    selection = [...selection, ...other.slice(0, 350 - selection.length)];
}

const archiveStr = selection.map(r => 
    `${r.slug}|${r.title}|${r.calories}|${Math.round(r.protein)}|${Math.round(r.carbs)}|${Math.round(r.fat)}`
).join("\n");

console.log('Total recipes available:', staticRecipes.length);
console.log('Base valid recipes:', baseValid.length);
console.log('Tier 1 (North Indian):', tier1.length);
console.log('Final selection size:', selection.length);
console.log('Archive length (chars):', archiveStr.length);
console.log('Estimated tokens:', Math.ceil(archiveStr.length / 4));
