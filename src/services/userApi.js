import apiClient from "./apiClient";

/** All user/customer-related API calls. Pages should import from here only. */

export const getUsers = async () => {
  const { data } = await apiClient.get("/api/users");
  return data;
};

export const getUserById = async (id) => {
  const { data } = await apiClient.get(`/api/users/${id}`);
  return data;
};

export const createUser = async (payload) => {
  const { data } = await apiClient.post("/api/users", payload);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await apiClient.put(`/api/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await apiClient.delete(`/api/users/${id}`);
  return data;
};
