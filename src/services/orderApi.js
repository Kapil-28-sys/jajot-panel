import apiClient from "./apiClient";

/** All order-related API calls. Pages should import from here only. */

export const getOrders = async () => {
  const { data } = await apiClient.get("/api/orders");
  return data;
};

export const getOrderById = async (id) => {
  const { data } = await apiClient.get(`/api/orders/${id}`);
  return data;
};

export const getOrdersByVendor = async (vendorId) => {
  const { data } = await apiClient.get(`/api/orders/vendordata/${vendorId}`);
  return data;
};

export const updateOrderStatus = async (id, status) => {
  const { data } = await apiClient.put(`/api/orders/${id}/status`, { status });
  return data;
};

export const createOrder = async (payload) => {
  const { data } = await apiClient.post("/api/orders/add", payload);
  return data;
};

export const deleteOrder = async (id) => {
  const { data } = await apiClient.delete(`/api/orders/${id}`);
  return data;
};
