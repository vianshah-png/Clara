export function calculateDailyCalories(profile) {
  const weight = parseFloat(profile.weight);
  const height = parseFloat(profile.height);
  const age = parseFloat(profile.age);
  const gender = (profile.gender || "").toLowerCase();
  const activity = (profile.activityLevel || "").toLowerCase();
  const goal = (profile.goal || "").toLowerCase();

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr += gender === "male" ? 5 : -161;

  const activityFactors = {
    sedentary: 1.2,
    "lightly active": 1.375,
    "moderately active": 1.55,
    "very active": 1.725,
    "extra active": 1.9,
  };

  const tdee = bmr * (activityFactors[activity] || 1.2);
  let target = tdee;
  if (goal.includes("loss")) target = tdee * 0.85;
  else if (goal.includes("gain")) target = tdee + 500;

  return Math.max(Math.round(target), gender === "male" ? 1500 : 1200);
}

export function calculateBMI(profile) {
  const weight = parseFloat(profile.weight);
  const heightM = parseFloat(profile.height) / 100;
  if (!weight || !heightM) return { bmi: 0, bmiClass: "Unknown" };

  const bmi = weight / (heightM * heightM);
  let bmiClass = "Normal";
  if (bmi < 18.5) bmiClass = "Underweight";
  else if (bmi < 25) bmiClass = "Normal";
  else if (bmi < 30) bmiClass = "Overweight";
  else bmiClass = "Obese";

  return { bmi: Math.round(bmi * 10) / 10, bmiClass };
}

export function calculateMacros(targetCalories, _bmi, goal) {
  const g = (goal || "").toLowerCase();
  const split = g.includes("loss")
    ? { carbs: 0.40, protein: 0.40, fat: 0.20 }
    : { carbs: 0.40, protein: 0.30, fat: 0.30 };

  return {
    proteinG: Math.round((targetCalories * split.protein) / 4),
    carbsG: Math.round((targetCalories * split.carbs) / 4),
    fatsG: Math.round((targetCalories * split.fat) / 9),
    split,
  };
}
