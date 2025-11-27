import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/database";
import passport from "./config/passport";
import waitlistRoutes from "./routes/waitlist";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import contactRoutes from "./routes/contact";
import customFieldRoutes from "./routes/customField";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3001", // Allow both ports for local development
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Health check endpoint (before DB middleware)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Debug endpoint to check environment (before DB middleware)
app.get("/debug", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    env: {
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriPrefix: process.env.MONGODB_URI?.substring(0, 20) + "...",
      nodeEnv: process.env.NODE_ENV,
      isVercel: process.env.VERCEL,
    },
  });
});

// Request logger middleware
app.use((req: Request, res: Response, next: any) => {
  console.log(`📥 ${req.method} ${req.url} - Path: ${req.path}`);
  next();
});

// Middleware to ensure database connection in serverless environment
app.use(async (req: Request, res: Response, next: any) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      success: false,
      error: "Database connection failed",
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/workspaces", contactRoutes);
app.use("/api/workspaces", customFieldRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found" });
});

// Initialize database connection and start server
const startServer = async () => {
  try {
    // Connect to MongoDB before starting the server
    await connectDB();

    app.listen(PORT, () => {
      console.log("🚀 Server is running");
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
      console.log(`🔑 Auth endpoints: http://localhost:${PORT}/api/auth`);
      console.log(`📋 Waitlist endpoints: http://localhost:${PORT}/api/waitlist`);
      console.log(`📁 Project endpoints: http://localhost:${PORT}/api/projects`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    // In serverless environment, don't exit - just log the error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Only start server if not in serverless environment (Vercel)
if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
