import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import http from "http";
import helmet from "helmet";
import connectDB from "./config/database";
import passport from "./config/passport";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import rateLimit from 'express-rate-limit';
import * as Sentry from "@sentry/node";
import { initializeChatSocket } from "./socket/chatSocket";
import { initializeAgentExecutionSocket } from "./socket/agentExecutionSocket";
import waitlistRoutes from "./routes/waitlist";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import contactRoutes from "./routes/contact";
import contactDeduplicationRoutes from "./routes/contactDeduplication";
import companyRoutes from "./routes/company";
import customFieldRoutes from "./routes/customField";
import pipelineRoutes from "./routes/pipeline";
import opportunityRoutes from "./routes/opportunity";
import activityRoutes from "./routes/activity";
import attachmentRoutes from "./routes/attachment";
import emailIntegrationRoutes from "./routes/emailIntegration";
import workflowRoutes from "./routes/workflow";
import workflowDataSourcesRoutes from "./routes/workflow/dataSources";
import fieldFetchingRoutes from "./routes/workflow/fieldFetching";
import credentialsRoutes from "./routes/credentials";
import googleSheetsRoutes from "./routes/integrations/googleSheets";
import notionRoutes from "./routes/integrations/notion";
import slackRoutes from "./routes/integrations/slack";
import emailTemplateRoutes from "./routes/emailTemplate";
import sequenceRoutes from "./routes/sequence";
import emailTrackingRoutes from "./routes/emailTracking";
import leadScoreRoutes from "./routes/leadScore";
import emailAccountRoutes from "./routes/emailAccount";
import campaignRoutes from "./routes/campaign";
import inboxRoutes from "./routes/inbox";
import enrichmentRoutes from "./routes/enrichment";
import apolloSettingsRoutes from "./routes/apolloSettings";
import taskRoutes from "./routes/task";
import notificationRoutes from "./routes/notification";
import teamRoutes from "./routes/team";
import ticketRoutes from "./routes/ticket";
import reportsRoutes from "./routes/reports";
import agentRoutes from "./routes/agent";
import agentBuilderRoutes from "./routes/agentBuilder";
import insightsRoutes from "./routes/insights";
import calendarIntegrationRoutes from "./routes/calendarIntegration";
import dashboardRoutes from "./routes/dashboard";
import setupWithAgentsRoutes from "./routes/setupWithAgents";
import proposalRoutes from "./routes/proposal";
import analyticsRoutes from "./routes/analytics";
import webhookRoutes from "./routes/webhooks";
import forecastRoutes from "./routes/forecast";
import callRecordingRoutes from "./routes/callRecording";
import formRoutes from "./routes/form";
import publicFormRoutes from "./routes/publicForm";
import landingPageRoutes from "./routes/landingPage";
import trackingRoutes from "./routes/tracking";
import chatRoutes from "./routes/chat";
import chatbotRoutes from "./routes/chatbot";
import intentScoringRoutes from "./routes/intentScoring";
import meetingSchedulerRoutes from "./routes/meetingScheduler";
import companyVisitorsRoutes from "./routes/companyVisitors";
import deliverabilityRoutes from "./routes/deliverability";
import salesforceIntegrationRoutes from "./routes/salesforceIntegration";
import lifecycleStageRoutes from "./routes/lifecycleStage";
import leadRecyclingRoutes from "./routes/leadRecycling";
import attributionRoutes from "./routes/attribution";
import referralRoutes from "./routes/referral";
import leadMagnetRoutes from "./routes/leadMagnet";
import voiceDropRoutes from "./routes/voiceDrop";
import formTemplateRoutes from "./routes/formTemplate";
import { workflowScheduler } from "./services/WorkflowScheduler";
import { startContactSyncScheduler } from "./services/contactSyncService";
import { startEmailSyncJob } from "./jobs/emailSyncJob";
import { startIntentScoreDecayJob } from "./jobs/intentScoreDecayJob";
import { startLifecycleProgressionJob } from "./jobs/lifecycleProgressionJob";
import { startLeadRecyclingJob } from "./jobs/leadRecyclingJob";
import { startAgentScheduledJob, registerAllLiveAgentSchedules } from "./jobs/agentScheduledJob";
import { startAgentEventTriggerJob } from "./jobs/agentEventTriggerJob";
import { startAgentResumeExecutionJob } from "./jobs/agentResumeExecutionJob";
import { initializeProactiveAIJobs } from "./jobs/proactiveAI";
import { startGoogleSheetFormSyncJob } from "./jobs/googleSheetFormSyncJob";
import { startSequenceEmailJob } from "./jobs/sequenceEmailJob";
import aiNotificationsRoutes from "./routes/aiNotifications";
import businessProfileRoutes from "./routes/businessProfile";
import { logger, httpLoggerMiddleware } from "./utils/logger";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";

import fs from "fs";

dotenv.config();

// ============================================
// GOOGLE CREDENTIALS SETUP
// Supports: Local file (vertex-key.json) OR Base64 env var (for Railway/production)
// ============================================
const setupGoogleCredentials = () => {
  const localKeyPath = path.join(process.cwd(), "vertex-key.json");
  const tempKeyPath = process.platform === 'win32'
    ? path.join(process.env.TEMP || 'C:\\temp', 'vertex-key.json')
    : '/tmp/vertex-key.json';

  // Option 1: Base64 encoded credentials from env (production/Railway)
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    try {
      const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
      fs.writeFileSync(tempKeyPath, credentials);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
      logger.info("Google credentials loaded from GOOGLE_CREDENTIALS_BASE64");
      return;
    } catch (error) {
      logger.error("Failed to decode GOOGLE_CREDENTIALS_BASE64", { error });
    }
  }

  // Option 2: Local file (development)
  if (fs.existsSync(localKeyPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = localKeyPath;
    logger.info("Google credentials loaded from local vertex-key.json");
    return;
  }

  // Option 3: Already set via env
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    logger.info("Google credentials already configured via GOOGLE_APPLICATION_CREDENTIALS");
    return;
  }

  logger.warn("No Google credentials found - Vertex AI features may not work");
};

setupGoogleCredentials();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ============================================
// SENTRY ERROR TRACKING
// ============================================
if (process.env.SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });

    // Note: In Sentry v8+, request/tracing handling is automatic via Sentry.init()
    // The Handlers API was deprecated and removed

    logger.info('Sentry error tracking enabled');
  } catch (error) {
    logger.warn('Sentry initialization failed', { error });
  }
} else {
  logger.warn('Sentry DSN not configured - error tracking disabled');
}

// Trust proxy - Required for Railway/cloud deployments
// This allows express-rate-limit to correctly identify users via X-Forwarded-For header
app.set('trust proxy', 1);

// ============================================
// GLOBAL RATE LIMITING
// ============================================
// General API rate limit: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => req.path.startsWith('/admin'), // Skip admin routes
});

// Auth rate limit: 5 requests per 15 minutes (stricter for login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// NOTE: Rate limiting is applied AFTER CORS middleware below (see lines 177-187)
// This ensures rate-limited responses include proper CORS headers

// Middleware
// Middleware
// Conditional CORS: Skip global CORS for tracking routes (handled by secureTrackingCors)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/public/track') || req.path.startsWith('/v1/sync')) {
    return next();
  }

  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3001", // Allow both ports for local development
      "http://localhost:3002", // Allow both ports for local development
      "https://clianta.online", //vercel dev
      "https://www.clianta.online", // www subdomain
      "https://abdulgffarsk.netlify.app", // User's test website
    ],
    credentials: true,
  })(req, res, next);
});

// Security headers using Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now (can be configured later)
  crossOriginEmbedderPolicy: false, // Required for embedding tracking scripts
}));

// Request size limits (prevent large payload attacks)
app.use(express.json({ limit: '100kb' })); // 100KB max for JSON
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Apply rate limiting AFTER CORS middleware (so rate-limited responses include CORS headers)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
  logger.info('Global rate limiting enabled (production)');
} else {
  logger.debug('Rate limiting disabled in development');
}

// Initialize Passport
app.use(passport.initialize());

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve tracking script (public, cacheable)
app.get('/track.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Serve minified tracking script (go up one level if in backend dir)
  const baseDir = process.cwd().endsWith('backend') ? path.join(process.cwd(), '..') : process.cwd();
  const scriptPath = path.join(baseDir, 'frontend', 'public', 'track.min.js');

  // Check if minified version exists, fallback to non-minified
  if (fs.existsSync(scriptPath)) {
    res.sendFile(scriptPath);
  } else {
    const fallbackPath = path.join(baseDir, 'frontend', 'public', 'track.js');
    if (fs.existsSync(fallbackPath)) {
      res.sendFile(fallbackPath);
    } else {
      res.status(404).send('// Tracking script not found');
    }
  }
});

// Serve tracking script with ad-blocker friendly name
app.get('/s.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const baseDir = process.cwd().endsWith('backend') ? path.join(process.cwd(), '..') : process.cwd();
  const scriptPath = path.join(baseDir, 'frontend', 'public', 's.min.js');

  if (fs.existsSync(scriptPath)) {
    res.sendFile(scriptPath);
  } else {
    const fallbackPath = path.join(baseDir, 'frontend', 'public', 's.js');
    if (fs.existsSync(fallbackPath)) {
      res.sendFile(fallbackPath);
    } else {
      res.status(404).send('// Script not found');
    }
  }
});

// Serve stealth analytics script (anti-ad-blocker)
// Using generic name 'a.js' to avoid detection
app.get('/a.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const baseDir = process.cwd().endsWith('backend') ? path.join(process.cwd(), '..') : process.cwd();
  const scriptPath = path.join(baseDir, 'frontend', 'public', 'a.js');

  if (fs.existsSync(scriptPath)) {
    res.sendFile(scriptPath);
  } else {
    res.status(404).send('// Script not found');
  }
});

// Serve form embed script (public, cacheable)
app.get('/forms/embed.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const baseDir = process.cwd().endsWith('backend') ? path.join(process.cwd(), '..') : process.cwd();
  const scriptPath = path.join(baseDir, 'frontend', 'public', 'forms', 'embed.js');

  if (fs.existsSync(scriptPath)) {
    res.sendFile(scriptPath);
  } else {
    res.status(404).send('// Form embed script not found');
  }
});

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

// Request logger middleware - use structured HTTP logger
app.use(httpLoggerMiddleware);

// Middleware to ensure database connection in serverless environment
app.use(async (req: Request, res: Response, next: any) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    logger.error("Database connection error", { error });
    res.status(500).json({
      success: false,
      error: "Database connection failed",
    });
  }
});

// ============================================
// BULL BOARD - Job Queue Monitoring Dashboard
// Access at: /admin/queues
// ============================================
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// Initialize Bull Board (will add queues dynamically in startServer)
const bullBoardInstance = createBullBoard({
  queues: [], // Queues added after initialization
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());
logger.info("Bull Board dashboard available at /admin/queues");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/workspaces", contactRoutes);
app.use("/api/workspaces", contactDeduplicationRoutes);
app.use("/api/workspaces", companyRoutes);
app.use("/api/workspaces", customFieldRoutes);
app.use("/api/workspaces", pipelineRoutes);
app.use("/api/workspaces", opportunityRoutes);
app.use("/api", activityRoutes);
app.use("/api", attachmentRoutes);
app.use("/api/email", emailIntegrationRoutes);
app.use("/api/workspaces", workflowRoutes);
app.use("/api/workspaces", workflowDataSourcesRoutes);
app.use("/api/workspaces", fieldFetchingRoutes);
app.use("/api/workspaces", credentialsRoutes);
app.use("/api/integrations", googleSheetsRoutes);
app.use("/api/integrations", notionRoutes);
app.use("/api/integrations", slackRoutes);
app.use("/api/workspaces", emailTemplateRoutes);
app.use("/api/workspaces", sequenceRoutes);
app.use("/api/email-tracking", emailTrackingRoutes);
app.use("/api/workspaces", leadScoreRoutes);
app.use("/api/email-accounts", emailAccountRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/enrichment", enrichmentRoutes);
app.use("/api/workspaces", apolloSettingsRoutes);
app.use("/api/workspaces", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/workspaces", teamRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/workspaces", ticketRoutes);
app.use("/api/workspaces", reportsRoutes);
app.use("/api/workspaces", agentRoutes);
app.use("/api", agentBuilderRoutes);
app.use("/api/workspaces", insightsRoutes);
app.use("/api/workspaces", dashboardRoutes);
app.use("/api/calendar", calendarIntegrationRoutes);
app.use("/api/workspaces", setupWithAgentsRoutes);
app.use("/api/workspaces", proposalRoutes);
app.use("/api/workspaces", analyticsRoutes);
app.use("/api/workspaces", webhookRoutes);
app.use("/api/workspaces", forecastRoutes);
app.use("/api/workspaces", meetingSchedulerRoutes);
app.use("/api/workspaces", companyVisitorsRoutes);
app.use("/api", deliverabilityRoutes);
app.use("/api", salesforceIntegrationRoutes); // Salesforce integration routes
app.use("/api/workspaces", callRecordingRoutes);
app.use("/api/public", publicFormRoutes); // Public form routes (no auth, mounted at /api/public)
app.use("/api/workspaces", formRoutes); // Authenticated workspace form routes
app.use("/api", landingPageRoutes); // Public landing page routes (MUST come before workspace routes)
app.use("/api/workspaces", landingPageRoutes);
app.use("/api", trackingRoutes); // Tracking routes (public and authenticated)
app.use("/api/workspaces", chatRoutes); // Chat conversation routes
app.use("/api/workspaces", chatbotRoutes); // Chatbot CRUD routes
app.use("/api/workspaces", intentScoringRoutes); // Intent scoring routes (behavioral analytics)
app.use("/api/lifecycle-stages", lifecycleStageRoutes); // Lifecycle stage management (MQL→SQL→SAL→Opportunity→Customer)
app.use("/api/lead-recycling", leadRecyclingRoutes); // Lead recycling and re-engagement
app.use("/api/attribution", attributionRoutes); // Multi-touch attribution and revenue tracking
app.use("/api/referrals", referralRoutes); // Referral program with viral growth mechanics
app.use("/api/lead-magnets", leadMagnetRoutes); // Gated content library
app.use("/api/voice-drops", voiceDropRoutes); // Ringless voicemail campaigns
app.use("/api/form-templates", formTemplateRoutes); // Smart form templates with conversion optimization
app.use("/api", aiNotificationsRoutes); // AI proactive notifications and insights
app.use("/api/workspaces", businessProfileRoutes); // Business profile for AI context

// AI Memory routes for viewing/managing learned knowledge
import aiMemoryRoutes from "./routes/aiMemory";
app.use("/api", aiMemoryRoutes);

// AI Content Generation with Business Profile Context
import aiContentRoutes from "./routes/aiContent";
app.use("/api/ai-content", aiContentRoutes); // AI-powered form, email, and page generation using business profile

// ============================================
// SENTRY ERROR HANDLER (must be before other error handlers)
// ============================================
if (process.env.SENTRY_DSN) {
  try {
    // Sentry v8+ uses setupExpressErrorHandler instead of Handlers.errorHandler()
    Sentry.setupExpressErrorHandler(app);
  } catch (error) {
    logger.warn('Sentry error handler not available', { error });
  }
}

// ============================================
// GLOBAL ERROR HANDLERS
// Must be after all routes - uses centralized error handling
// ============================================
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Initialize database connection and start server
const startServer = async () => {
  try {
    // Connect to MongoDB before starting the server
    await connectDB();

    // Create HTTP server (required for Socket.IO)
    const httpServer = http.createServer(app);

    // Initialize Socket.IO for real-time chat
    const io = initializeChatSocket(httpServer);
    logger.info('Chat Socket.IO initialized');

    // Initialize Socket.IO for agent execution updates (Story 3.2) - REUSE same io server
    initializeAgentExecutionSocket(io);
    logger.info('Agent Execution Socket.IO initialized');

    httpServer.listen(PORT, async () => {
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
      logger.info("Server started", {
        port: PORT,
        backendUrl,
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
        authEndpoints: `${backendUrl}/api/auth`,
        projectEndpoints: `${backendUrl}/api/projects`,
      });

      // Start workflow scheduler (runs every 30 seconds - uses node-cron, NOT Redis)
      workflowScheduler.start();
      logger.info('Workflow scheduler started');

      // Start all background jobs
      logger.info('Starting background jobs...');

      // Start sequence email job (runs every 2 minutes)
      startSequenceEmailJob().catch((error) => {
        logger.error('Failed to start sequence email job', { error });
      });

      // Start email sync job
      startEmailSyncJob().catch((error) => {
        logger.error('Failed to start email sync job', { error });
      });

      // Start contact sync scheduler (void function - no promise)
      try {
        startContactSyncScheduler();
      } catch (error) {
        logger.error('Failed to start contact sync scheduler', { error });
      }

      // Start intent score decay job
      startIntentScoreDecayJob().catch((error) => {
        logger.error('Failed to start intent score decay job', { error });
      });

      // Start lifecycle progression job (void function - no promise)
      try {
        startLifecycleProgressionJob();
      } catch (error) {
        logger.error('Failed to start lifecycle progression job', { error });
      }

      // Start lead recycling job (void function - no promise)
      try {
        startLeadRecyclingJob();
      } catch (error) {
        logger.error('Failed to start lead recycling job', { error });
      }

      // Initialize proactive AI jobs (meeting prep, stale deals, daily insights)
      initializeProactiveAIJobs().catch((error) => {
        logger.error('Failed to initialize proactive AI jobs', { error });
      });

      // Start Google Sheet form sync job
      startGoogleSheetFormSyncJob().catch((error) => {
        logger.error('Failed to start Google Sheet form sync job', { error });
      });

      // Story 3.3: Start agent scheduled job worker and register existing schedules
      try {
        await startAgentScheduledJob();
        await registerAllLiveAgentSchedules();
        logger.info('✅ Agent scheduled job started');
      } catch (error) {
        logger.error('Failed to start agent scheduled job', { error });
      }

      // Story 3.4: Start agent event trigger job worker
      try {
        await startAgentEventTriggerJob();
        logger.info('✅ Agent event trigger job started');
      } catch (error) {
        logger.error('Failed to start agent event trigger job', { error });
      }

      // Story 3.5: Start agent resume execution job worker (for wait action handling)
      try {
        await startAgentResumeExecutionJob();
        logger.info('✅ Agent resume execution job started');
      } catch (error) {
        logger.error('Failed to start agent resume execution job', { error });
      }

      logger.info('✅ All background jobs started successfully');

      // Initialize event consumers
      (async () => {
        try {
          const { initializeConsumers } = await import('./events/consumers');
          const { queueManager } = await import('./events/queue/QueueManager');
          initializeConsumers();
          logger.info('Event consumers initialized');

          // Add all BullMQ queues to Bull Board for monitoring
          const queues = Array.from((queueManager as any).queues.values());
          if (queues.length > 0) {
            queues.forEach((queue: any) => {
              bullBoardInstance.addQueue(new BullMQAdapter(queue));
            });
            logger.info('Bull Board monitoring queues', { queueCount: queues.length });
          }
        } catch (eventError) {
          logger.error('Failed to initialize event consumers', { error: eventError });
          // Don't crash server - events are non-critical
        }
      })();
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    // In serverless environment, don't exit - just log the error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

logger.debug("Server loading", { nodeEnv: process.env.NODE_ENV, vercel: process.env.VERCEL });
// Only start server if not in serverless environment (Vercel) and not in test mode
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  startServer();
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  try {
    const { queueManager } = await import('./events/queue/QueueManager');
    const { closeRedisConnection } = await import('./config/redis');

    await queueManager.shutdown();
    await closeRedisConnection();
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  try {
    const { queueManager } = await import('./events/queue/QueueManager');
    const { closeRedisConnection } = await import('./config/redis');

    await queueManager.shutdown();
    await closeRedisConnection();
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
  }

  process.exit(0);
});

export default app;
