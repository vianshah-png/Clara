export type Gender = 'Male' | 'Female' | 'Other';
export type Goal = 'Weight Loss' | 'Weight Gain' | 'Maintenance';
export type DietType = 'Vegetarian' | 'Non-Vegetarian' | 'Eggetarian' | 'Vegan' | 'Jain';
export type ActivityLevel = 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';

export interface UserProfile {
  age: string;
  weight: string;
  height: string;
  gender: Gender;
  goal: Goal;
  dietType: DietType;
  activityLevel: ActivityLevel;
  ethnicity: string;
  cuisine: string;
  allergies: string;
  user_id?: string;
}

export interface Macro {
  label: string;
  value: string;
  unit: string;
}

export interface Ingredient {
  name: string;
  amount: string; // e.g., "100g", "1 cup"
  category: string; // e.g., "Produce", "Dairy", "Grains"
  alternative?: string; // e.g., "Tofu" instead of "Paneer"
}

export interface InstructionStep {
  text: string;
  durationMinutes?: number; // Optional timer for this step
}

export interface Recipe {
  name: string;
  url: string;
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fats: number; // g
  description?: string;
  servingSize: string; // e.g. "350g" or "1 Bowl (250g)"
  ingredients?: Ingredient[];
  instructions?: InstructionStep[];
  prepTime?: string; // e.g. "15 mins"
  category?: string;
  recipe_type?: string;
  nutrient_tags?: string[];
  health_tags?: string[];
}

export interface DailyPlan {
  day: string;
  breakfast: Recipe | Recipe[];
  lunch: Recipe | Recipe[];
  snack: Recipe | Recipe[];
  dinner: Recipe | Recipe[];
  summary: string;
}

export type WeeklyPlan = DailyPlan[];
