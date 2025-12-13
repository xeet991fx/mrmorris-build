import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import * as authApi from "@/lib/api/auth";
import type { User } from "@/lib/api/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, username?: string, profilePicture?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  getCurrentUser: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;

  // OTP Actions
  sendOTP: (email: string, purpose: "registration" | "login" | "password-reset") => Promise<void>;
  verifyOTP: (email: string, code: string, purpose: "registration" | "login" | "password-reset") => Promise<void>;
  completeRegistration: (email: string, password: string, name: string, username?: string, profilePicture?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Login user
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login({ email, password });

          if (response.success && response.data) {
            const { token, user } = response.data;

            // Store token in localStorage and cookies
            localStorage.setItem("token", token);
            Cookies.set("token", token, { expires: 7 }); // 7 days

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Login failed. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });

          throw error;
        }
      },

      /**
       * Register new user
       */
      register: async (email: string, password: string, name: string, username?: string, profilePicture?: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.register({ email, password, name, username, profilePicture });

          if (response.success) {
            set({
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Registration failed. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Logout user
       */
      logout: async () => {
        try {
          // Call logout API
          await authApi.logout();
        } catch (error) {
          console.error("Logout API error:", error);
        } finally {
          // Clear local state regardless of API success
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          Cookies.remove("token");

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      /**
       * Verify email
       */
      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.verifyEmail(token);

          if (response.success && response.data) {
            const { token: authToken, user } = response.data;

            // Store token and auto-login
            localStorage.setItem("token", authToken);
            Cookies.set("token", authToken, { expires: 7 });

            set({
              user,
              token: authToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Email verification failed. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Request password reset
       */
      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          await authApi.forgotPassword({ email });

          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to send reset email. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Reset password
       */
      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.resetPassword({ token, password });

          if (response.success && response.data) {
            const { token: authToken, user } = response.data;

            // Store token and auto-login
            localStorage.setItem("token", authToken);
            Cookies.set("token", authToken, { expires: 7 });

            set({
              user,
              token: authToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Password reset failed. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Get current user
       */
      getCurrentUser: async () => {
        const token = get().token || localStorage.getItem("token");

        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });

        try {
          const response = await authApi.getCurrentUser();

          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          // If token is invalid, clear auth state
          localStorage.removeItem("token");
          Cookies.remove("token");

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Set user (for manual updates)
       */
      setUser: (user: User | null) => {
        set({ user });
      },

      /**
       * Set token (for manual updates)
       */
      setToken: (token: string | null) => {
        if (token) {
          localStorage.setItem("token", token);
          Cookies.set("token", token, { expires: 7 });
          set({ token, isAuthenticated: true });
        } else {
          localStorage.removeItem("token");
          Cookies.remove("token");
          set({ token: null, isAuthenticated: false });
        }
      },

      /**
       * Fetch user (alias for getCurrentUser)
       */
      fetchUser: async () => {
        await get().getCurrentUser();
      },

      /**
       * Send OTP code
       */
      sendOTP: async (email: string, purpose: "registration" | "login" | "password-reset") => {
        set({ isLoading: true, error: null });

        try {
          await authApi.sendOTP({ email, purpose });

          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Failed to send OTP. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Verify OTP code
       */
      verifyOTP: async (email: string, code: string, purpose: "registration" | "login" | "password-reset") => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.verifyOTP({ email, code, purpose });

          // For login, store token and user data
          if (purpose === "login" && response.success && response.data) {
            const { token, user } = response.data;

            localStorage.setItem("token", token);
            Cookies.set("token", token, { expires: 7 });

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // For registration and password-reset, just mark as successful
            set({
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Invalid or expired OTP code.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Complete registration after OTP verification
       */
      completeRegistration: async (email: string, password: string, name: string, username?: string, profilePicture?: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.completeRegistration({ email, password, name, username, profilePicture });

          if (response.success && response.data) {
            const { token, user } = response.data;

            // Store token and user data
            localStorage.setItem("token", token);
            Cookies.set("token", token, { expires: 7 });

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || "Registration failed. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
