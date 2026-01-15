import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import User, { IUser } from "../models/User";

// Validate JWT_SECRET at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error("CRITICAL: JWT_SECRET environment variable is required in production");
}

const getJwtSecret = (): string => {
  if (JWT_SECRET) return JWT_SECRET;
  return "dev-only-secret-do-not-use-in-production";
};

// JWT Strategy Options
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: getJwtSecret(),
};

// JWT Strategy
passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      const user = await User.findById(jwtPayload.id);

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Local Strategy (for email/password login)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // Find user and include password field
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Check if password matches
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Check if email is verified
        if (!user.isVerified) {
          return done(null, false, { message: "Please verify your email address" });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/google/callback`,
      },
      async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
          // Check if user already exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // User exists, return user
            return done(null, user);
          }

          // Check if user exists with same email
          user = await User.findOne({ email: profile.emails?.[0]?.value });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.authProvider = "google";
            user.isVerified = true; // Google accounts are auto-verified
            user.profilePicture = profile.photos?.[0]?.value;
            await user.save();
            return done(null, user);
          }

          // Create new user
          const newUser = await User.create({
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            googleId: profile.id,
            authProvider: "google",
            isVerified: true, // Google accounts are auto-verified
            profilePicture: profile.photos?.[0]?.value,
          });

          return done(null, newUser);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export default passport;
