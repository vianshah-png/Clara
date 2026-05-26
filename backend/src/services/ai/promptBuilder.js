export function build3DayPrompt(profile, targetCalories, bmi, bmiClass, macros, archive) {
  const bfCal = Math.round(targetCalories * 0.25);
  const lunchCal = Math.round(targetCalories * 0.30);
  const snackCal = Math.round(targetCalories * 0.15);
  const dinnerCal = Math.round(targetCalories * 0.30);
  const { proteinG, carbsG, fatsG } = macros;

  let goalAdvice = "";
  if (profile.goal?.toLowerCase().includes("loss")) {
    goalAdvice = "Focus on high-protein, high-fiber meals to promote satiety. Keep dinner lighter. Avoid fried items.";
  } else if (profile.goal?.toLowerCase().includes("gain")) {
    goalAdvice = "Include calorie-dense, nutrient-rich foods. Add healthy fats and complex carbs. Ensure adequate post-workout nutrition.";
  } else {
    goalAdvice = "Maintain balanced nutrition with variety. Focus on micronutrient diversity across meals.";
  }

  const weightVal = parseFloat(profile.weight || "70");
  const weightRule = weightVal >= 100
    ? "WEIGHT RULE: Client is >= 100kg. Lunch and Dinner options MUST include equivalents of Salad AND Sabzi AND Roti."
    : "WEIGHT RULE: Client is < 100kg. Lunch and Dinner options MUST include equivalents of (Salad OR Sabzi) AND Roti.";

  const recall = profile.foodRecall || { breakfast: [], lunch: [], snack: [], dinner: [] };
  const recallStr = `
IDEAL MEAL PREFERENCES (Food Recall):
- Breakfast: ${recall.breakfast?.length ? recall.breakfast.join(", ") : "Any"}
- Lunch: ${recall.lunch?.length ? recall.lunch.join(", ") : "Any"}
- Snack: ${recall.snack?.length ? recall.snack.join(", ") : "Any"}
- Dinner: ${recall.dinner?.length ? recall.dinner.join(", ") : "Any"}
Please prioritize these items when selecting recipes if they fit the macros.
`;

  return `You are Clara AI, a Senior Clinical Dietitian at Balance Nutrition.
Create a personalized 3-DAY meal plan for this specific client.

CLIENT PROFILE
Age: ${profile.age} | Gender: ${profile.gender} | Weight: ${profile.weight}kg | Height: ${profile.height}cm
Goal: ${profile.goal}
BMI: ${bmi} (${bmiClass})
Diet Type: ${profile.dietType}
Cuisine Preference: ${profile.cuisine || "Indian"}
Ethnicity: ${profile.ethnicity || "Indian"}
Allergies: ${profile.allergies || "None"}
Aversions: ${profile.aversions || "None"}
Health Conditions: ${profile.health_conditions || "None"}

${recallStr}

DAILY NUTRITIONAL TARGETS (STRICT)
Total Daily Calories: ${targetCalories} kcal (tolerance +/-100 kcal)
Protein: ~${proteinG}g | Carbs: ~${carbsG}g | Fats: ~${fatsG}g

Per-Meal Calorie & Macro Budget:
- Breakfast (~${bfCal} kcal): Protein ~${Math.round(proteinG * 0.25)}g | Carbs ~${Math.round(carbsG * 0.25)}g | Fat ~${Math.round(fatsG * 0.25)}g
- Lunch (~${lunchCal} kcal): Protein ~${Math.round(proteinG * 0.30)}g | Carbs ~${Math.round(carbsG * 0.30)}g | Fat ~${Math.round(fatsG * 0.30)}g
- Snack (~${snackCal} kcal): Protein ~${Math.round(proteinG * 0.15)}g | Carbs ~${Math.round(carbsG * 0.15)}g | Fat ~${Math.round(fatsG * 0.15)}g
- Dinner (~${dinnerCal} kcal): Protein ~${Math.round(proteinG * 0.30)}g | Carbs ~${Math.round(carbsG * 0.30)}g | Fat ~${Math.round(fatsG * 0.30)}g

CLINICAL GUIDANCE & MENTOR RULES
${goalAdvice}
${weightRule}
${profile.health_conditions && profile.health_conditions !== "None" ? `Special consideration for: ${profile.health_conditions}` : ""}

RECIPE VAULT (format: slug|name|calories|protein|carbs|fat|cat)
cat codes: BF=Breakfast only, S=Snack only, L/D=Lunch or Dinner, ANY=flexible
${archive}

RULES
1. Use ONLY slugs from the vault above.
2. For Breakfast, Lunch, and Dinner, provide MULTIPLE OPTIONS as instructed below:
   - BREAKFAST: Exactly 3 options. Option 1: "Salt-free", Option 2: "Sugar-free", Option 3: "Regular".
   - LUNCH: Exactly 2 options. Option 1: "Rice-based", Option 2: "Roti-based".
   - DINNER: Exactly 3 distinct options.
3. COMBINE 2-3 recipes for Lunch/Dinner (e.g., roti + dal + sabzi) to reach the calorie target and satisfy the WEIGHT RULE.
4. PORTION MULTIPLIER (CRITICAL): If the recipes you select are too small to hit the meal's calorie/macro target, you MUST output a \`servings\` multiplier (e.g., 2, 2.5, or 3) for that item.
5. Do NOT repeat the exact same options across different days.
6. Avoid any ingredients matching the client's allergies or aversions.
7. Clinical Summary: Write a 2-3 sentence summary for each day explaining the clinical reasoning.

OUTPUT FORMAT
Output a JSON object following the Zod schema provided via the tool call. Ensure the structure maps precisely.
`;
}
