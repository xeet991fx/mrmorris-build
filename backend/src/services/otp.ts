import OTP, { IOTP } from "../models/OTP";
import crypto from "crypto";

class OTPService {
  /**
   * Generate a 6-digit OTP code
   */
  private generateOTPCode(): string {
    // Generate cryptographically secure 6-digit code
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create and save OTP
   */
  async createOTP(
    email: string,
    purpose: "registration" | "login" | "password-reset"
  ): Promise<string> {
    // Delete any existing OTPs for this email and purpose
    await OTP.deleteMany({ email, purpose });

    // Generate new OTP code
    const code = this.generateOTPCode();

    // Create OTP document
    await OTP.create({
      email,
      code,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
    });

    return code;
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    email: string,
    code: string,
    purpose: "registration" | "login" | "password-reset"
  ): Promise<{ success: boolean; message?: string }> {
    // Find OTP
    const otp = await OTP.findOne({
      email,
      purpose,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      return {
        success: false,
        message: "Invalid or expired OTP code.",
      };
    }

    // Check attempts
    if (otp.attempts >= 5) {
      await OTP.deleteOne({ _id: otp._id });
      return {
        success: false,
        message: "Too many failed attempts. Please request a new code.",
      };
    }

    // Verify code
    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      return {
        success: false,
        message: `Invalid OTP code. ${5 - otp.attempts} attempts remaining.`,
      };
    }

    // Success - delete OTP after verification
    await OTP.deleteOne({ _id: otp._id });

    return { success: true };
  }

  /**
   * Check if user can request OTP (rate limiting)
   */
  async canRequestOTP(
    email: string,
    purpose: "registration" | "login" | "password-reset"
  ): Promise<{ canRequest: boolean; message?: string; retryAfter?: number }> {
    // Count OTPs created in the last hour for this email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentOTPs = await OTP.countDocuments({
      email,
      purpose,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentOTPs >= 3) {
      return {
        canRequest: false,
        message: "Too many OTP requests. Please try again later.",
        retryAfter: 3600, // 1 hour in seconds
      };
    }

    return { canRequest: true };
  }

  /**
   * Delete OTP
   */
  async deleteOTP(
    email: string,
    purpose: "registration" | "login" | "password-reset"
  ): Promise<void> {
    await OTP.deleteMany({ email, purpose });
  }

  /**
   * Get remaining time for OTP
   */
  async getRemainingTime(
    email: string,
    purpose: "registration" | "login" | "password-reset"
  ): Promise<number | null> {
    const otp = await OTP.findOne({
      email,
      purpose,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      return null;
    }

    return Math.floor((otp.expiresAt.getTime() - Date.now()) / 1000);
  }
}

export default new OTPService();
