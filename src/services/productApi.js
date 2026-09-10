import apiClient from "./apiClient";

/**
 * All product-related API calls. Pages should only import from this file —
 * never call axios/fetch directly for products.
 *
 * Auth is handled automatically by apiClient (reads the "adminToken" saved
 * at login by config/localAuth.js), so no per-call token wiring is needed
 * here.
 */

export const createProduct = (data) => apiClient.post("/api/products/add", data);
export const getProducts = (params) => apiClient.get("/api/products", { params });
export const getProductById = (productId) => apiClient.get(`/api/products/${productId}`);
export const updateProduct = (productId, data) => apiClient.put(`/api/products/${productId}`, data);
export const deleteProduct = (productId) => apiClient.delete(`/api/products/${productId}`);
export const publishProduct = (productId) => apiClient.patch(`/api/products/${productId}/publish`);
export const archiveProduct = (productId) => apiClient.patch(`/api/products/${productId}/archive`);
export const duplicateProduct = (productId) => apiClient.post(`/api/products/${productId}/duplicate`);

// The backend's /products/bulk-update and /products/bulk-delete routes have
// been inconsistent about which body shape they accept. These try the
// standard shape first, then fall back to alternate shapes ONLY when the
// server specifically complains about a missing product id (400 + message
// mentions "product id") — any other error (auth, 500, etc.) surfaces
// immediately instead of being masked by retries.
export const bulkUpdateProducts = async (productIds, update) => {
  const attempts = [
    { productIds, update },
    { productIds, ...update },
    { ids: productIds, update },
    { ids: productIds, ...update },
  ];
  let lastErr;
  for (const body of attempts) {
    try {
      return await apiClient.post("/api/products/bulk-update", body);
    } catch (e) {
      lastErr = e;
      const msg = (e.response?.data?.message || "").toLowerCase();
      if (e.response?.status !== 400 || !msg.includes("product id")) throw e;
    }
  }
  throw lastErr;
};

export const bulkDeleteProducts = async (productIds) => {
  const attempts = [{ productIds }, { ids: productIds }];
  let lastErr;
  for (const body of attempts) {
    try {
      return await apiClient.post("/api/products/bulk-delete", body);
    } catch (e) {
      lastErr = e;
      const msg = (e.response?.data?.message || "").toLowerCase();
      if (e.response?.status !== 400 || !msg.includes("product id")) throw e;
    }
  }
  throw lastErr;
};

export const filterProducts = (params) => apiClient.get("/api/products/filtter", { params });
export const searchProducts = (query, extraParams = {}) =>
  apiClient.get("/api/products/search", { params: { q: query, ...extraParams } });
export const getProductRecommendations = (divId) => apiClient.get(`/api/products/recommendations/${divId}`);
export const getProductFilters = (params) => apiClient.get("/api/products/filters", { params });
export const getProductFiltersByCategory = (categoryId) => apiClient.get(`/api/products/filters/${categoryId}`);
export const getProductFiltersByInventory = (inventory) => apiClient.get(`/api/products/filters/${inventory}`);
export const getInventoryByVendor = (vendorId) => apiClient.get(`/api/products/inventory/vendor/${vendorId}`);
export const updateVariantInventory = (vendorId, productId, variantId, data) =>
  apiClient.put(`/api/products/inventory/${vendorId}/${productId}/${variantId}`, data);
export const updateVariantStatus = (variantId, status) =>
  apiClient.patch(`/api/products/variant/${variantId}/status`, { status });
export const getProductsByVendor = (vendorId) => apiClient.get(`/api/products/vendor/${vendorId}`);
export const getProductMisc = () => apiClient.get("/api/products/product");
