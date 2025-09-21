// client/src/api/axios.js
import axios from "axios";

// Create axios instance with baseURL
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
});

// Request interceptor → add access token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor → auto-refresh access token
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");
        if (refresh) {
          // 👇 Notice: use the same baseURL instead of hardcoding localhost
          const res = await axios.post(
            `${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/auth/refresh/`,
            { refresh }
          );

          localStorage.setItem("access", res.data.access);

          // Retry the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return API(originalRequest);
        }
      } catch (err) {
        console.error("❌ Refresh token failed:", err);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login"; // force re-login
      }
    }

    return Promise.reject(error);
  }
);

export default API;
