import axios from "axios";
import Cookies from "js-cookie";

// Get base URL from environment variable
// If NEXT_PUBLIC_API_URL already includes /api, use it as is
// Otherwise, append /api to the URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Debug log - only in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("=== AXIOS CONFIGURATION DEBUG ===");
  console.log("🔍 NEXT_PUBLIC_API_URL (env var):", process.env.NEXT_PUBLIC_API_URL);
  console.log("🔍 API_URL (final baseURL):", API_URL);
  console.log("================================");
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 0, // No timeout
  withCredentials: true,
});

// Request interceptor - Attach JWT token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Debug log - Only in development
    if (process.env.NODE_ENV === "development") {
      console.log("🚀 Making request to:", (config.baseURL || '') + (config.url || ''));
      console.log("📋 Request config:", {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
      });
    }

    // Get token from localStorage or cookies
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || Cookies.get("token")
        : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Request error:", error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Response received:", {
        status: response.status,
        statusText: response.statusText,
      });
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Response error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
    }

    // Handle 401 Unauthorized - Clear token and redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Only clear tokens and redirect if not on auth-related pages
        const authPages = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/auth", "/invite", "/join"];
        const currentPath = window.location.pathname;

        if (!authPages.some(page => currentPath.startsWith(page))) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          Cookies.remove("token");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export { axiosInstance };
export default axiosInstance;
