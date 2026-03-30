
import { recipes } from './backend/data/recipeData.js';
console.log('Total recipes in fallback:', recipes.length);

const cuisines = {};
const categories = {};

recipes.forEach(r => {
  cuisines[r.cuisine] = (cuisines[r.cuisine] || 0) + 1;
  categories[r.category] = (categories[r.category] || 0) + 1;
});

console.log('Cuisines:', cuisines);
console.log('Categories:', categories);
