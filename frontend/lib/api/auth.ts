import { axiosInstance } from "../axios";

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  profilePicture?: string;
  profession?: string;
  isVerified: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: User;
  };
  error?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  username?: string;
  profilePicture?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface SendOTPData {
  email: string;
  purpose: "registration" | "login" | "password-reset";
}

export interface VerifyOTPData {
  email: string;
  code: string;
  purpose: "registration" | "login" | "password-reset";
}

export interface CompleteRegistrationData {
  email: string;
  password: string;
  name: string;
  username?: string;
  profilePicture?: string;
}

/**
 * Register new user
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await axiosInstance.post("/auth/register", data);
  return response.data;
};

/**
 * Login user
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await axiosInstance.post("/auth/login", data);
  return response.data;
};

/**
 * Verify email
 */
export const verifyEmail = async (token: string): Promise<AuthResponse> => {
  const response = await axiosInstance.post("/auth/verify-email", { token });
  return response.data;
};

/**
 * Request password reset
 */
export const forgotPassword = async (
  data: ForgotPasswordData
): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post("/auth/forgot-password", data);
  return response.data;
};

/**
 * Reset password
 */
export const resetPassword = async (
  data: ResetPasswordData
): Promise<AuthResponse> => {
  const response = await axiosInstance.post("/auth/reset-password", data);
  return response.data;
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<{
  success: boolean;
  data: { user: User };
}> => {
  const response = await axiosInstance.get("/auth/me");
  return response.data;
};

/**
 * Change password
 */
export const changePassword = async (
  data: ChangePasswordData
): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post("/auth/change-password", data);
  return response.data;
};

/**
 * Resend verification email
 */
export const resendVerification = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post("/auth/resend-verification", {
    email,
  });
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

/**
 * Send OTP code to email
 */
export const sendOTP = async (
  data: SendOTPData
): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.post("/auth/send-otp", data);
  return response.data;
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (
  data: VerifyOTPData
): Promise<AuthResponse> => {
  const response = await axiosInstance.post("/auth/verify-otp", data);
  return response.data;
};

/**
 * Complete registration after OTP verification
 */
export const completeRegistration = async (
  data: CompleteRegistrationData
): Promise<AuthResponse> => {
  const response = await axiosInstance.post("/auth/complete-register", data);
  return response.data;
};

/**
 * Get Google OAuth URL
 */
export const getGoogleAuthUrl = (): string => {
  return `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
};

/**
 * Update user profile (name, profession)
 */
export const updateProfile = async (
  data: { name?: string; profession?: string }
): Promise<AuthResponse> => {
  const response = await axiosInstance.put("/auth/profile", data);
  return response.data;
};
