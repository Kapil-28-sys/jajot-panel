import apiClient from "./apiClient";

/** All vendor-related API calls. Pages should import from here only. */

export const getVendors = async () => {
  const { data } = await apiClient.get("/api/users");
  return data;
};

export const getVendorStats = async (vendorId) => {
  const { data } = await apiClient.get(`/api/products/vendor/${vendorId}/stats`);
  return data;
};

export const getVendorOrders = async (vendorId, limit = 5) => {
  const { data } = await apiClient.get(`/api/orders/vendordata/${vendorId}`, {
    params: { limit },
  });
  return data;
};

export const getVendorTopProducts = async (vendorId, limit = 6) => {
  const { data } = await apiClient.get(`/api/products/vendor/${vendorId}/top-products`, {
    params: { limit },
  });
  return data;
};

export const updateVendorStatus = async (id, status) => {
  const { data } = await apiClient.put(`/api/users/${id}/status`, { status });
  return data;
};
