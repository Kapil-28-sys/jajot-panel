import apiClient from "./apiClient";

export const login = async (credentials) => {
  const { data } = await apiClient.post("/api/users/login", credentials);
  return data;
};
