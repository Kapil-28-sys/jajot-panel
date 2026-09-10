import apiClient from "./apiClient";

/**
 * All category-tree related API calls live here: categories, subcategories,
 * sub-to-sub categories, and category attributes. Pages should only import
 * from this file and never call axios/fetch directly.
 */

// ── Categories ───────────────────────────────────────────────────────────
export const getCategories = async () => {
  const { data } = await apiClient.get("/api/categories");
  return data;
};

export const getCategoryTree = async () => {
  const { data } = await apiClient.get("/api/categories/tree");
  return data;
};

export const getCategoryChildren = async (id) => {
  const { data } = await apiClient.get(`/api/categories/children/${id}`);
  return data;
};

export const getCategoryParents = async (id) => {
  const { data } = await apiClient.get(`/api/categories/parents/${id}`);
  return data;
};

export const createCategory = async (payload) => {
  const { data } = await apiClient.post("/api/categories/add", payload);
  return data;
};

export const updateCategory = async (id, payload) => {
  const { data } = await apiClient.put(`/api/categories/${id}`, payload);
  return data;
};

export const deleteCategory = async (id) => {
  const { data } = await apiClient.delete(`/api/categories/delete/${id}`);
  return data;
};

// ── Sub categories ───────────────────────────────────────────────────────
export const getSubCategories = async () => {
  const { data } = await apiClient.get("/api/subcategories");
  return data;
};

export const createSubCategory = async (payload) => {
  const { data } = await apiClient.post("/api/subcategories/add", payload);
  return data;
};

export const updateSubCategory = async (id, payload) => {
  const { data } = await apiClient.put(`/api/subcategories/update/${id}`, payload);
  return data;
};

export const deleteSubCategory = async (id) => {
  const { data } = await apiClient.delete(`/api/subcategories/delete/${id}`);
  return data;
};

// ── Sub-to-sub categories ────────────────────────────────────────────────
export const getSubToSubCategories = async () => {
  const { data } = await apiClient.get("/api/subtosubcategories");
  return data;
};

export const createSubToSubCategory = async (payload) => {
  const { data } = await apiClient.post("/api/subtosubcategories/add", payload);
  return data;
};

export const updateSubToSubCategory = async (id, payload) => {
  const { data } = await apiClient.put(`/api/subtosubcategories/${id}`, payload);
  return data;
};

export const deleteSubToSubCategory = async (id) => {
  const { data } = await apiClient.delete(`/api/subtosubcategories/${id}`);
  return data;
};

// ── Category attributes ──────────────────────────────────────────────────
export const getCategoryAttributes = async (categoryId) => {
  const { data } = await apiClient.get(`/api/categoryattribute/category/${categoryId}`);
  return data;
};

export const createCategoryAttribute = async (payload) => {
  const { data } = await apiClient.post("/api/categoryattribute/add", payload);
  return data;
};
