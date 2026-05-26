export function preFilterRecipes(recipes, profile) {
  const isVeg = profile.dietType?.toLowerCase().includes("veg") && !profile.dietType?.toLowerCase().includes("non");
  const isJain = profile.dietType?.toLowerCase().includes("jain");

  const allergyArr = (profile.allergies && profile.allergies !== "None")
    ? profile.allergies.toLowerCase().split(",").map(a => a.trim()).filter(Boolean)
    : [];

  const aversionArr = (profile.aversions && profile.aversions !== "None")
    ? profile.aversions.toLowerCase().split(",").map(a => a.trim()).filter(Boolean)
    : [];

  return recipes.filter(r => {
    if (!r.calories || r.calories === 0) return false;
    if (isVeg && r.recipe_type?.toLowerCase().includes("non-veg")) return false;

    if (isJain) {
      const title = r.title?.toLowerCase() || "";
      if (title.includes("onion") || title.includes("garlic")) return false;
    }

    const titleLower = r.title?.toLowerCase() || "";
    if (allergyArr.some(a => titleLower.includes(a))) return false;
    if (aversionArr.some(a => titleLower.includes(a))) return false;

    return true;
  });
}

export function buildSearchQuery(profile) {
  const parts = [];
  if (profile.dietType) parts.push(profile.dietType);
  if (profile.cuisine) parts.push(`${profile.cuisine} cuisine`);
  if (profile.goal) parts.push(profile.goal);
  if (profile.ethnicity) parts.push(profile.ethnicity);
  if (profile.health_conditions && profile.health_conditions !== "None") {
    parts.push(`suitable for ${profile.health_conditions}`);
  }

  const recall = profile.foodRecall;
  if (recall) {
    const prefs = [];
    if (recall.breakfast?.length) prefs.push(...recall.breakfast);
    if (recall.lunch?.length) prefs.push(...recall.lunch);
    if (recall.snack?.length) prefs.push(...recall.snack);
    if (recall.dinner?.length) prefs.push(...recall.dinner);
    if (prefs.length > 0) parts.push(`prefers ${prefs.join(", ")}`);
  }

  return parts.join(" ").trim() || "healthy recipe";
}
