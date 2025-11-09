import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Debug log
if (typeof window !== "undefined") {
  console.log("🔍 API_URL:", API_URL);
  console.log("🔍 Full baseURL:", `${API_URL}/api`);
}

const axiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

// Request interceptor - Attach JWT token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Debug log - More detailed
    console.log("🚀 Making request to:", (config.baseURL || '') + (config.url || ''));
    console.log("📋 Request config:", {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      headers: config.headers,
      data: config.data
    });

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
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("✅ Response received:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  (error) => {
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

    // Handle 401 Unauthorized - Clear token and redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        Cookies.remove("token");

        // Only redirect if not already on auth pages
        const authPages = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];
        const currentPath = window.location.pathname;

        if (!authPages.some(page => currentPath.startsWith(page))) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export { axiosInstance };
export default axiosInstance;
