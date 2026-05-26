import { serviceConfig } from "../config/serviceConfig.js";

export async function fetchUserProfile(userId) {
  if (serviceConfig.useMockData) {
    return {
      age: "30", weight: "65", height: "160", gender: "Female", goal: "Weight Loss",
      dietType: "Vegetarian", activityLevel: "Moderately Active", ethnicity: "Indian",
      cuisine: "North Indian", allergies: "None", aversions: "Mushrooms",
    };
  }

  const cleanBaseUrl = serviceConfig.bnClientApi.split("?")[0];
  const url = `${cleanBaseUrl}?user_id=${userId}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const json = await response.json();
    const client = json.data;
    const details = client.client_details || {};
    const weightData = client.weight || {};

    console.log(`[Data] Raw Profile fetched for ${userId}:`, JSON.stringify({
      eating_habit: details.eating_habit,
      cuisine: details.cuisine_preferance,
      goal: client.program_details?.program_name,
      key_insight: details.key_insight,
    }, null, 2));

    return {
      age: details.age?.toString() || "30",
      weight: weightData.program_start_weight?.toString() || "70",
      height: details.height?.toString() || "160",
      gender: details.gender || "Female",
      goal: client.program_details?.program_name || "Maintenance",
      dietType: details.eating_habit || "Vegetarian",
      activityLevel: details.activity_level || "Moderately Active",
      ethnicity: details.ethnicity || "Indian",
      cuisine: details.cuisine_preferance || "Indian",
      allergies: Array.isArray(details.allergies) ? details.allergies.join(", ") : (details.allergies || "None"),
      aversions: Array.isArray(details.aversions) ? details.aversions.join(", ") : (details.aversions || "None"),
      health_conditions: details.key_insight || "None",
    };
  } catch (err) {
    console.warn(`[BN API] Profile failed for user, using default. Error: ${err.message}`);
    return {
      age: "30", weight: "70", height: "170", gender: "Female", goal: "Weight Loss",
      dietType: "Vegetarian", activityLevel: "Sedentary", ethnicity: "Indian",
      cuisine: "Indian", allergies: "None",
    };
  }
}
