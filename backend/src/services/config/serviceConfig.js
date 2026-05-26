export const serviceConfig = {
  useMockData: process.env.USE_MOCK_DATA === "true",
  bnRecipeApi: process.env.BN_RECIPE_API || "https://bn-new-api.balancenutritiononline.com/api/v1/recipe/all",
  bnClientApi: process.env.BN_CLIENT_API_URL || "https://bn-new-api.balancenutritiononline.com/api/v1/client-details/get-single-client-by-user_id",
  bnShopApi: process.env.BN_SHOP_API || "https://bn-new-api.balancenutritiononline.com/api/v1/shop-product/all-products",
};

export const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours
