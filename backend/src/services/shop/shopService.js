import { serviceConfig, CACHE_TTL } from "../config/serviceConfig.js";

let shopStore = [];
let lastShopFetch = 0;

export async function fetchShopProducts() {
  const now = Date.now();
  if (shopStore.length > 0 && now - lastShopFetch < CACHE_TTL) {
    return shopStore;
  }

  try {
    const res = await fetch(serviceConfig.bnShopApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Shop API returned ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json) ? json[0] : json;

    if (data && data.status === "success" && data.data && Array.isArray(data.data.products)) {
      shopStore = data.data.products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.categories?.[0]?.name || "Healthy Alternative",
        slug: p.slug,
        image: p.thumbnail,
        price: p.price,
        description: p.description?.replace(/<[^>]*>/g, " ").trim() || "",
        shopUrl: `https://shop.balancenutrition.in/product/${p.slug}`,
      }));
      lastShopFetch = now;
      console.log(`[Shop API] Synced ${shopStore.length} products`);
    } else {
      console.warn("[Shop API] Unexpected data structure:", Object.keys(data || {}));
    }
  } catch (err) {
    console.warn(`[Shop API] Sync failed: ${err.message}`);
  }

  return shopStore;
}

export async function findShopAlternatives(basketItems) {
  const shopProducts = await fetchShopProducts();
  if (!shopProducts.length) return [];

  const priorityCategories = ["Healthy Grains", "Healthy Millets", "Wood-Pressed Oils"];

  return basketItems.map(item => {
    const itemNameLower = item.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    const itemWords = itemNameLower.split(" ").filter(w => w.length > 2);
    if (itemWords.length === 0) return null;

    const candidates = shopProducts.filter(p => {
      const pNameLower = p.name.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const pWords = pNameLower.split(" ");

      if (pNameLower.includes(itemNameLower) || itemNameLower.includes(pNameLower)) return true;
      if (itemWords.some(word => pWords.includes(word))) return true;

      return (
        (itemNameLower.includes("barley") && pNameLower.includes("barley")) ||
        (itemNameLower.includes("oats") && pNameLower.includes("oats")) ||
        (itemNameLower.includes("makhana") && pNameLower.includes("makhana")) ||
        (itemNameLower.includes("poha") && pNameLower.includes("poha")) ||
        (itemNameLower.includes("chana") && pNameLower.includes("chana")) ||
        (itemNameLower.includes("ghee") && pNameLower.includes("ghee")) ||
        (itemNameLower.includes("flour") && pNameLower.includes("atta")) ||
        (itemNameLower.includes("atta") && pNameLower.includes("atta")) ||
        (itemNameLower.includes("peanut butter") && pNameLower.includes("peanut butter")) ||
        (itemNameLower.includes("oil") && pNameLower.includes("oil"))
      );
    });

    if (candidates.length === 0) return null;

    const match = candidates.sort((a, b) => {
      const aPrio = priorityCategories.includes(a.category) ? 0 : 1;
      const bPrio = priorityCategories.includes(b.category) ? 0 : 1;
      return aPrio - bPrio;
    })[0];

    return {
      original: item,
      alternative: match.name,
      category: match.category,
      shopUrl: match.shopUrl,
      image: match.image,
      price: match.price,
    };
  }).filter(Boolean);
}

function splitPreferenceText(value) {
  if (!value || value === "None") return [];
  if (Array.isArray(value)) return value.map(v => String(v).toLowerCase().trim()).filter(Boolean);
  return String(value).toLowerCase().split(",").map(v => v.trim()).filter(Boolean);
}

function productContainsAny(product, terms) {
  if (terms.length === 0) return false;
  const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
  return terms.some(term => term && haystack.includes(term));
}

function isSnackProduct(product) {
  const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
  const snackSignals = [
    "snack", "bar", "cookie", "cookies", "cracker", "crackers", "makhana",
    "chikki", "granola", "trail", "seed mix", "nut mix", "peanut butter",
    "spread", "muesli", "flakes", "roasted", "bites", "laddu", "ladoo",
    "khakhra", "chips", "energy", "protein",
  ];
  const excludedStaples = [
    "oil", "atta", "flour", "rice", "millet", "grains", "ghee",
    "masala", "spice", "salt", "sugar",
  ];

  const hasSnackSignal = snackSignals.some(signal => haystack.includes(signal));
  const isLikelyStaple = excludedStaples.some(signal => haystack.includes(signal));
  return hasSnackSignal && !isLikelyStaple;
}

export async function getQuickFillers(profile = {}, limit = 8) {
  const shopProducts = await fetchShopProducts();
  if (!shopProducts.length) return [];

  const exclusions = [
    ...splitPreferenceText(profile.allergies),
    ...splitPreferenceText(profile.aversions),
  ];

  return shopProducts
    .filter(product => isSnackProduct(product))
    .filter(product => !productContainsAny(product, exclusions))
    .slice(0, limit)
    .map(product => ({
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.image,
      price: product.price,
      description: product.description,
      shopUrl: product.shopUrl,
    }));
}
