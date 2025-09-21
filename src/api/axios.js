// client/src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
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
          const res = await axios.post(
            "http://127.0.0.1:8000/api/auth/refresh/", // ⛔ might need fixing later
            { refresh }
          );

          localStorage.setItem("access", res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return API(originalRequest);
        }
      } catch (err) {
        console.error("❌ Refresh token failed:", err);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

console.log("🔍 API Base URL →", API.defaults.baseURL); // 👈 add this line

export default API;
