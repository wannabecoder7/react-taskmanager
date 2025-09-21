// client/src/api/axios.js
import axios from "axios";

const API = axios.create({   // axios Instance
  baseURL: "http://127.0.0.1:8000/api/",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Response interceptor → refresh token if expired
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");
        if (refresh) {
          const res = await axios.post(// API call to get new access tokens
            "http://127.0.0.1:8000/api/auth/refresh/",
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
