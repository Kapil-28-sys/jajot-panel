import axios from "axios";
import { API_BASE_URL } from "../config/api";

const TOKEN_KEY = "adminToken";

const isUsableToken = (token) =>
  Boolean(token) && token !== "null" && token !== "undefined";

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token) => {
  if (isUsableToken(token)) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the bearer token (when present) to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (isUsableToken(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Common error handling: clear an expired/invalid token on 401/403, then
// re-reject with the original axios error so existing `err.response.*`
// access patterns across the app keep working unchanged.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      clearAuthToken();
    }
    return Promise.reject(error);
  }
);

// Optional helper for new/migrated pages that want a single, human-readable
// message out of any axios error without repeating this everywhere.
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error?.response) return "Network error. Please check your connection and try again.";
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    `Request failed with status ${error.response.status}.` ||
    fallback
  );
};

export const isAuthError = (error) =>
  error?.response?.status === 401 || error?.response?.status === 403;

export default apiClient;
