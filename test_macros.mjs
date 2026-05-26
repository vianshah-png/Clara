import { calculateDailyCalories, calculateMacros, calculateBMI } from './backend/src/services/geminiService.js';

const profile = {
  "age": "22",
  "gender": "Male",
  "height": "170",
  "weight": "47",
  "goal": "Weight Gain",
  "dietType": "Vegetarian",
  "activityLevel": "Moderately Active",
  "ethnicity": "Asian",
};

const targetCalories = calculateDailyCalories(profile);
const { bmi, bmiClass } = calculateBMI(profile);
const macros = calculateMacros(targetCalories, bmi, profile.goal);

console.log('Calories:', targetCalories);
console.log('Macros:', macros);
