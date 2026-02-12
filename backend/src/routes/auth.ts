import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import passport from "passport";
import User from "../models/User";
import emailService from "../services/email";
import otpService from "../services/otp";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  sendOTPSchema,
  verifyOTPSchema,
  completeRegistrationSchema,
} from "../validations/auth";
import { logger } from "../utils/logger";
import oauthRoutes from "./auth/oauth"; // Story 5.1: OAuth routes

const router = express.Router();

// Validate JWT_SECRET at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error("CRITICAL: JWT_SECRET environment variable is required in production");
}

const getJwtSecret = (): string => {
  if (JWT_SECRET) return JWT_SECRET;
  return "dev-only-secret-do-not-use-in-production";
};

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: "Too many email requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Generate JWT token
 */
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    } as jwt.SignOptions
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post("/register", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });

    if (existingUser) {
      // If user registered via Google OAuth, tell them to use Google login
      if (existingUser.authProvider === "google") {
        return res.status(400).json({
          success: false,
          error: "This email is registered with Google. Please use 'Login with Google' to access your account.",
          useGoogleAuth: true,
        });
      }
      return res.status(400).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    // Check username uniqueness if provided
    if (validatedData.username) {
      const existingUsername = await User.findOne({ username: validatedData.username.toLowerCase() });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          error: "This username is already taken. Please choose another.",
        });
      }
    }

    // Create user
    const user = await User.create({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      username: validatedData.username?.toLowerCase(),
      profilePicture: validatedData.profilePicture,
      isVerified: false,
    });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken
      );
    } catch (emailError) {
      logger.error("Failed to send verification email", { error: emailError });
      // Continue registration even if email fails
    }

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          profilePicture: user.profilePicture,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    logger.error("Registration error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);

    // Find user with password
    const user = await User.findOne({ email: validatedData.email }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    // Check if user registered via Google OAuth - they must login via Google
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        error: "This account was created using Google. Please login with Google instead.",
        useGoogleAuth: true,
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(validatedData.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        error:
          "Please verify your email address before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
      });
    }

    // Generate token
    const token = generateToken((user._id as any).toString());

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    logger.error("Login error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email
 * @access  Public
 */
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = verifyEmailSchema.parse(req.body);

    // Find user with verification token
    const user = await User.findOne({
      verificationToken: validatedData.token,
      verificationTokenExpires: { $gt: Date.now() },
    }).select("+verificationToken +verificationTokenExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification token.",
      });
    }

    // Verify user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      logger.error("Failed to send welcome email", { error: emailError });
    }

    // Generate token for auto-login
    const token = generateToken((user._id as any).toString());

    res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now login.",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    logger.error("Email verification error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Email verification failed. Please try again.",
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
  "/forgot-password",
  emailLimiter,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const validatedData = forgotPasswordSchema.parse(req.body);

      // Find user
      const user = await User.findOne({ email: validatedData.email });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.status(200).json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send reset email
      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          user.name,
          resetToken
        );
      } catch (emailError) {
        logger.error("Failed to send password reset email", { error: emailError });
        // Clear reset token if email fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(500).json({
          success: false,
          error: "Failed to send password reset email. Please try again.",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      logger.error("Forgot password error", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Failed to process request. Please try again.",
      });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  "/reset-password",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const validatedData = resetPasswordSchema.parse(req.body);

      // Find user with reset token
      const user = await User.findOne({
        resetPasswordToken: validatedData.token,
        resetPasswordExpires: { $gt: Date.now() },
      }).select("+resetPasswordToken +resetPasswordExpires");

      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired password reset token.",
        });
      }

      // Update password
      user.password = validatedData.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Generate token for auto-login
      const token = generateToken((user._id as any).toString());

      res.status(200).json({
        success: true,
        message: "Password reset successful! You can now login.",
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            isVerified: user.isVerified,
          },
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      logger.error("Password reset error", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Password reset failed. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          profilePicture: user.profilePicture,
          profession: user.profession,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error("Get user error", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get user information.",
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate input
      const validatedData = changePasswordSchema.parse(req.body);

      // Get user with password
      const user = await User.findById(req.user?._id).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found.",
        });
      }

      // Check current password
      const isPasswordValid = await user.comparePassword(
        validatedData.currentPassword
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Current password is incorrect.",
        });
      }

      // Update password
      user.password = validatedData.newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password changed successfully!",
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      logger.error("Change password error", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Failed to change password. Please try again.",
      });
    }
  }
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  "/resend-verification",
  emailLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required.",
        });
      }

      const user = await User.findOne({ email });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If an unverified account exists, a verification email has been sent.",
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          error: "This account is already verified.",
        });
      }

      // Generate new verification token
      const verificationToken = user.generateVerificationToken();
      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(
          user.email,
          user.name,
          verificationToken
        );
      } catch (emailError) {
        logger.error("Failed to send verification email", { error: emailError });
        return res.status(500).json({
          success: false,
          error: "Failed to send verification email. Please try again.",
        });
      }

      res.status(200).json({
        success: true,
        message: "If an unverified account exists, a verification email has been sent.",
      });
    } catch (error) {
      logger.error("Resend verification error", { error });
      res.status(500).json({
        success: false,
        error: "Failed to resend verification email.",
      });
    }
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post("/logout", authenticate, (req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Logout successful!",
  });
});

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP code to email
 * @access  Public
 */
router.post("/send-otp", emailLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = sendOTPSchema.parse(req.body);
    const { email, purpose } = validatedData;

    // Check rate limiting
    const rateLimitCheck = await otpService.canRequestOTP(email, purpose);
    if (!rateLimitCheck.canRequest) {
      return res.status(429).json({
        success: false,
        error: rateLimitCheck.message,
        retryAfter: rateLimitCheck.retryAfter,
      });
    }

    // For registration, check if user already exists
    if (purpose === "registration") {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // If user registered via Google OAuth, tell them to use Google login
        if (existingUser.authProvider === "google") {
          return res.status(400).json({
            success: false,
            error: "This email is registered with Google. Please use 'Login with Google' to access your account.",
            useGoogleAuth: true,
          });
        }
        return res.status(400).json({
          success: false,
          error: "An account with this email already exists.",
        });
      }
    }

    // For login and password-reset, check if user exists
    if (purpose === "login" || purpose === "password-reset") {
      const user = await User.findOne({ email });
      if (!user) {
        // Return success to prevent email enumeration
        return res.status(200).json({
          success: true,
          message: "If an account exists, an OTP code has been sent to your email.",
        });
      }

      // For login, check if user uses email/password auth
      if (purpose === "login" && user.authProvider !== "email") {
        return res.status(400).json({
          success: false,
          error: `This account uses ${user.authProvider} authentication. Please use ${user.authProvider} to sign in.`,
        });
      }
    }

    // Generate and save OTP
    const code = await otpService.createOTP(email, purpose);

    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, code, purpose);
    } catch (emailError) {
      logger.error("Failed to send OTP email", { error: emailError });
      return res.status(500).json({
        success: false,
        error: "Failed to send OTP email. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP code sent successfully! Please check your email.",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    logger.error("Send OTP error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to send OTP. Please try again.",
    });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post("/verify-otp", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = verifyOTPSchema.parse(req.body);
    const { email, code, purpose } = validatedData;

    // Verify OTP
    const verificationResult = await otpService.verifyOTP(email, code, purpose);

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.message,
      });
    }

    // For login, generate token and return user data
    if (purpose === "login") {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found.",
        });
      }

      // Generate token
      const token = generateToken((user._id as any).toString());

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully!",
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            isVerified: user.isVerified,
          },
        },
      });
    }

    // For registration and password-reset, just confirm verification
    res.status(200).json({
      success: true,
      message: "OTP verified successfully!",
      data: {
        verified: true,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    logger.error("Verify OTP error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to verify OTP. Please try again.",
    });
  }
});

/**
 * @route   POST /api/auth/complete-register
 * @desc    Complete registration after OTP verification
 * @access  Public
 */
router.post(
  "/complete-register",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const validatedData = completeRegistrationSchema.parse(req.body);
      const { email, password, name } = validatedData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // If user registered via Google OAuth, tell them to use Google login
        if (existingUser.authProvider === "google") {
          return res.status(400).json({
            success: false,
            error: "This email is registered with Google. Please use 'Login with Google' to access your account.",
            useGoogleAuth: true,
          });
        }
        return res.status(400).json({
          success: false,
          error: "An account with this email already exists.",
        });
      }

      // Check username uniqueness if provided
      if (validatedData.username) {
        const existingUsername = await User.findOne({ username: validatedData.username.toLowerCase() });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            error: "This username is already taken. Please choose another.",
          });
        }
      }

      // Create user (already verified via OTP)
      const user = await User.create({
        email,
        password,
        name,
        username: validatedData.username?.toLowerCase(),
        profilePicture: validatedData.profilePicture,
        isVerified: true, // Auto-verified via OTP
        authProvider: "email",
      });

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }

      // Generate token for auto-login
      const token = generateToken((user._id as any).toString());

      res.status(201).json({
        success: true,
        message: "Registration completed successfully!",
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            username: user.username,
            profilePicture: user.profilePicture,
            isVerified: user.isVerified,
          },
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      logger.error("Complete registration error", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Registration failed. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback — sets httpOnly cookie and redirects (no token in URL)
 * @access  Public
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=authentication_failed`
        );
      }

      // Generate JWT token
      const token = generateToken(user._id.toString());

      // Pass short-lived token via URL query parameter
      // This avoids cross-origin cookie issues when frontend and backend
      // are on different domains (e.g., Railway deployments)
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (error) {
      logger.error("Google callback error", { error });
      res.redirect(
        `${process.env.FRONTEND_URL}/login?error=authentication_failed`
      );
    }
  }
);

/**
 * @route   POST /api/auth/session
 * @desc    Exchange httpOnly auth_handoff cookie for a token + user response
 * @access  Public (cookie-authenticated)
 */
router.post("/session", async (req: Request, res: Response) => {
  try {
    // Accept token from request body (production) or cookie (legacy/local)
    const handoffToken = req.body?.token || req.cookies?.auth_handoff;

    if (!handoffToken) {
      return res.status(401).json({
        success: false,
        error: "No authentication session found. Please try logging in again.",
      });
    }

    // Clear the handoff cookie immediately (one-time use)
    res.clearCookie("auth_handoff", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/session",
    });

    // Verify the token
    const decoded = jwt.verify(handoffToken, getJwtSecret()) as { id: string };

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found. Please try logging in again.",
      });
    }

    // Return the token and user data in the response body
    res.status(200).json({
      success: true,
      message: "Session established successfully.",
      data: {
        token: handoffToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          profilePicture: user.profilePicture,
          profession: user.profession,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    // Clear cookie on any error
    res.clearCookie("auth_handoff", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/session",
    });

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Session expired. Please try logging in again.",
      });
    }

    logger.error("Session exchange error", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to establish session. Please try again.",
    });
  }
});

// Story 5.1: Mount OAuth routes
// Routes: /api/auth/oauth/:provider/authorize, /api/auth/oauth/:provider/callback
router.use("/oauth", oauthRoutes);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile (name, profession)
 * @access  Private
 */
router.put("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, profession } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const updateData: any = {};
    if (name && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (profession) {
      const validProfessions = [
        'Engineering', 'Design', 'Product', 'Marketing',
        'Sales', 'Operations', 'HR', 'Finance',
        'Support', 'Leadership', 'Freelance', 'Other',
      ];
      if (!validProfessions.includes(profession)) {
        return res.status(400).json({ success: false, error: "Invalid profession" });
      }
      updateData.profession = profession;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          profilePicture: user.profilePicture,
          profession: user.profession,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    logger.error("Profile update error", { error: error.message });
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

export default router;
