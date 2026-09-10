const DEFAULT_API_URL = "https://amazon-multi-vendor-3.onrender.com";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_URL
).replace(/\/$/, "");

export const apiUrl = (path = "") =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const assetUrl = (path) => {
  if (!path || path.startsWith("http")) return path;
  return apiUrl(path);
};
