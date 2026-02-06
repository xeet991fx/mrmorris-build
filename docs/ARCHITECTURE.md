# Clianta - System Architecture

## Product Overview

**Clianta** is an AI-native CRM that autonomously executes sales and customer success tasks through multi-agent coordination.

- **Product Name**: Clianta
- **Domain**: https://clianta.online
- **Tagline**: "AI-Native CRM That Builds Itself"
- **Category**: AI-Native CRM
- **Legacy Note**: Codebase uses "mrmorris" in folder/package names from a previous product pivot

## 1. High-Level Architecture

Clianta follows a **modern monorepo architecture** with clear separation between frontend, backend, and AI services. The system is built on an event-driven foundation with real-time capabilities and autonomous multi-agent coordination.

```
┌────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  Next.js 15 (App Router) + React 19 + Tailwind CSS            │
│  • 46 Workspace Features  • Real-time UI  • shadcn/ui         │
└────────────────┬───────────────────────────────────────────────┘
                 │ HTTP + WebSocket
┌────────────────┴───────────────────────────────────────────────┐
│                         API GATEWAY LAYER                       │
│  Express.js + Passport + Rate Limiting + CORS                  │
│  • 66 Route Handlers  • JWT Auth  • Request Validation        │
└────────────────┬───────────────────────────────────────────────┘
                 │
      ┌──────────┼──────────┬──────────────┬──────────────┐
      │          │           │              │              │
┌─────┴────┐ ┌──┴────┐ ┌────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
│ Business │ │  AI   │ │  Event   │ │Real-time  │ │Integration│
│  Logic   │ │Agents │ │  System  │ │ Socket.io │ │  Services │
│ Services │ │ (24)  │ │ (BullMQ) │ │   Layer   │ │  (8 APIs) │
└─────┬────┘ └──┬────┘ └────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │         │            │             │             │
      └─────────┴────────────┴─────────────┴─────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
      ┌─────┴─────┐                ┌─────┴─────┐
      │  MongoDB  │                │   Redis   │
      │ (Primary  │                │ (Cache +  │
      │   Data)   │                │  Queues)  │
      └───────────┘                └───────────┘
```

## 2. Technology Stack by Layer

### Frontend Layer
- **Framework**: Next.js 15 (App Router) - Server-side rendering with React Server Components
- **UI Library**: React 19.2.3 - Latest React with concurrent features
- **Language**: TypeScript 5.x - Type-safe development
- **Styling**: Tailwind CSS 3.4 + Custom CSS - Utility-first styling
- **UI Components**: shadcn/ui (Radix UI primitives) - Accessible, customizable components
- **State Management**: Zustand 5.0.8 - Lightweight state management for auth, workspace context
- **HTTP Client**: Axios 1.13.2 - API communication with interceptors
- **Form Management**: React Hook Form + Zod - Type-safe form validation
- **Charts**: Chart.js + Recharts - Analytics visualizations
- **Drag & Drop**: @dnd-kit + ReactFlow - Workflow builder and kanban boards
- **Email Editor**: React Email Editor (Unlayer) - Visual email template design
- **Real-time**: Socket.io Client 4.8.3 - WebSocket communication for chat
- **Animations**: Framer Motion 11.0 - Smooth UI transitions

### Backend Layer
- **Runtime**: Node.js 18+ with Express 4.18.2
- **Language**: TypeScript 5.3.3 compiled to CommonJS
- **Database**: MongoDB 8.0+ with Mongoose 8.0 ODM
- **Cache/Session**: Redis via ioredis 5.8.2 (supports Upstash TLS)
- **Queue System**: BullMQ 5.66.1 - Background job processing
- **Authentication**:
  - Passport.js 0.7.0 (Strategy pattern)
  - passport-jwt: JWT token validation
  - passport-local: Email/password auth
  - passport-google-oauth20: Google OAuth
  - bcryptjs: Password hashing
- **Validation**: Zod 3.22 - Runtime schema validation
- **File Processing**:
  - Multer 2.0.2: File uploads
  - Sharp 0.34.5: Image optimization
  - pdf-parse: PDF extraction
- **Scheduling**: node-cron 4.2.1 - Cron-based job scheduling
- **Real-time**: Socket.io 4.8.3 - WebSocket server
- **Error Tracking**: Sentry Node 10.32.1 - Production error monitoring
- **Security**:
  - express-rate-limit: API rate limiting
  - express-mongo-sanitize: NoSQL injection prevention
  - CORS: Origin validation
  - JWT secrets and session management

### AI & Agent Layer
- **AI Provider**: Google Gemini 2.5 Pro via @google/generative-ai 0.24.1
- **Orchestration**: LangChain Core 1.1.6 + LangChain Google VertexAI 2.1.1
- **Agent Framework**: Custom multi-agent coordination system (DeepAgents package exists but not used)
- **Location**: `backend/src/chatbot/` - Contains supervisor, coordinator, and 24 worker agents
- **Agents**: 24 specialized worker agents (see AGENT_SYSTEM.md)
- **Capabilities**:
  - Multi-agent parallel and sequential execution
  - Complexity analysis for task delegation
  - Supervised agent coordination
  - Long-term memory via AI Memory system
  - Tool-based function calling

### Integration Layer
- **Communication**:
  - Slack (@slack/web-api 7.13.0)
  - Twilio 5.11.1 - SMS and voice
- **Email Services**:
  - Nodemailer 7.0.10 - SMTP email sending
  - Resend 6.6.0 - Transactional emails
- **Productivity**:
  - Google APIs (googleapis 167.0.0) - Calendar, Sheets, Drive
  - Notion (@notionhq/client 5.6.0)
- **Data Enrichment**: Apollo.io - Contact data enrichment
- **File Processing**: xlsx 0.18.5 - Excel import/export

### Infrastructure Layer
- **Queue Monitoring**: Bull Board (@bull-board/api + express adapter) - Web UI at `/admin/queues`
- **Database**: MongoDB Atlas (recommended) or self-hosted MongoDB 5.0+
- **Cache**: Upstash Redis (recommended) or self-hosted Redis 6.0+
- **Deployment**:
  - Backend: Railway / Render / AWS
  - Frontend: Vercel (optimized for Next.js)
- **Environment**: Node.js 18+ (TypeScript requires modern Node)

## 3. Monorepo Structure

```
mrmorris-build/                        # Root (legacy naming from pivot)
├── frontend/                          # Next.js application
├── backend/                           # Express API server
├── agent-os/                          # Development standards (Claude Code skills)
├── integrations/                      # Integration helpers (WordPress)
├── docs/                              # Documentation (this folder)
├── package.json                       # Root scripts (concurrently dev mode)
└── tsconfig.json                      # Root TypeScript config
```

### Rationale for Monorepo
- **Shared TypeScript Types**: Common interfaces between frontend/backend
- **Coordinated Development**: Single git history, synchronized releases
- **Development Experience**: One `npm run dev` starts both frontend + backend
- **Simplified Deployment**: Can deploy to monorepo-friendly platforms (Railway, Vercel)

## 4. Frontend Architecture (Next.js 15 App Router)

### App Router Structure
```
frontend/app/
├── (auth)/                            # Route groups for auth pages
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── dashboard/                         # Main dashboard
├── projects/[id]/                     # Workspace-scoped routes (46 features)
│   ├── contacts/
│   ├── companies/
│   ├── pipelines/                     # Kanban deal management
│   ├── campaigns/                     # Email marketing
│   ├── sequences/                     # Email sequences
│   ├── workflows/                     # Visual workflow automation
│   ├── forms/                         # Form builder
│   ├── chatbots/                      # AI chatbot builder
│   ├── email-accounts/                # Email config (Gmail, Outlook, SMTP)
│   ├── email-templates/               # Template library
│   ├── email-analytics/               # Campaign performance
│   ├── inbox/                         # Unified inbox
│   ├── intent/                        # Behavioral intent scoring
│   ├── lead-scores/                   # A-F lead grading
│   ├── meetings/                      # Meeting scheduler
│   ├── analytics/                     # Dashboards & reports
│   ├── settings/                      # Workspace configuration
│   └── [20+ more feature routes]
├── layout.tsx                         # Root layout (fonts, metadata, providers)
├── page.tsx                           # Landing page
└── globals.css                        # Tailwind + custom styles
```

### Component Organization (36 Categories)
```
frontend/components/
├── shared/                            # Reusable components (buttons, modals, etc.)
├── ui/                                # shadcn/ui primitives
├── [feature]/                         # Feature-specific components
    ├── analytics/, apollo/, auth/
    ├── campaigns/, chat/, companies/
    ├── contacts/, dashboard/
    ├── email-accounts/, email-analytics/, email-templates/
    ├── forms/, inbox/, intent/
    ├── landing/, lead-scores/, meetings/
    ├── pipelines/, projects/, reports/
    ├── salesforce/, sequences/, settings/
    └── workflows/
```

### State Management Strategy
- **Local State**: React useState/useReducer for component state
- **Server State**: Next.js Server Components + Server Actions (where applicable)
- **Global State**: Zustand stores for:
  - `useAuthStore`: Authentication, current user
  - `useWorkspaceStore`: Current workspace (project) context
  - `useThemeStore`: Dark/light mode preferences
- **Form State**: React Hook Form with Zod validation schemas
- **Real-time State**: Socket.io for chat messages, notifications

## 5. Backend Architecture (Express + TypeScript)

### Middleware Stack (Order Matters)
```javascript
1. setupGoogleCredentials()           // Initialize Google Vertex AI
2. Sentry.init()                      // Error tracking (if DSN provided)
3. app.set('trust proxy', 1)          // For Railway/cloud deployments
4. cors()                             // CORS with whitelisted origins
5. express.json() + urlencoded()      // Request parsing (100KB limit)
6. cookieParser()                     // Cookie handling
7. Rate Limiting (production only):   // Prevent abuse
   - apiLimiter: 100 req/15min
   - authLimiter: 5 req/15min (login, register)
8. passport.initialize()              // Authentication strategies
9. express.static('/uploads')         // Serve uploaded files
10. Tracking scripts (/track.js, /s.js, /forms/embed.js)
11. connectDB() middleware            // Ensure MongoDB connection
12. Route handlers (60+ files)        // Business logic
13. Sentry error handler              // Capture errors
14. 404 handler                       // Catch-all
```

### Service Layer Pattern
Backend follows a **layered architecture**:

```
Routes (HTTP endpoints)
   ↓
Controllers (request handling, validation)
   ↓
Services (business logic, orchestration)
   ↓
Models (Mongoose schemas, database access)
   ↓
Database (MongoDB)
```

**Key Services** (55+ files in `backend/src/services/`):
- **AI Services**: `ai.service.ts`, `AIMemoryService.ts`, `AIDataExtractor.ts`, `AIEmailWriterService.ts`
- **CRM Core**: `leadScoring.ts`, `intentScoring.ts`, `leadQualification.ts`, `leadRouting.ts`
- **Integrations**: `SalesforceService.ts`, `ApolloService.ts`, `EmailAccountService.ts`, `EmailService.ts`
- **Automation**: `WorkflowService.ts`, `WorkflowScheduler.ts`, `CampaignService.ts`
- **Background**: `EmailWarmupService.ts`, `EmailVerificationService.ts`
- **Workflow Actions** (15+ services): Email, SMS, enrollWorkflow, assignOwner, updateField, createTask, etc.

### Route Organization (66 Files)
All routes are scoped under `/api`:
- **Workspace-scoped**: `/api/workspaces/:workspaceId/[resource]` - Multi-tenancy isolation
- **Global**: `/api/auth`, `/api/integrations`, `/api/tracking`
- **Public**: `/api/public/forms`, `/api/landing-pages/:slug`
- **Admin**: `/admin/queues` - Bull Board dashboard

## 6. Database Architecture (MongoDB + Mongoose)

### Schema Design
- **79 Mongoose Models** organized by category (see MODELS_AND_SCHEMAS.md for complete list):
  - **Core CRM** (11 models): User, Project, Contact, Company, Opportunity, Pipeline, Activity, Task, Ticket, CustomFieldDefinition, Team
  - **Marketing** (12 models): Campaign, EmailTemplate, Sequence, Form, Chatbot, LandingPage, LeadMagnet, VoiceDrop, FormTemplate, EmailMessage, TrackingEvent, CompanyVisitor
  - **AI/Chatbot** (8 models): AIClientMemory, AINotification, Conversation, Meeting, MeetingRecording, AIMemory, ChatbotMessage, ChatbotSession
  - **Legacy/Archived** (8 models): Agent, AgentExecution, AgentTestRun, AgentMemory, AgentSession, AgentPerformance, AgentInsight, AgentCopilotConversation (preserved for recovery - see docs/legacy/)
  - **Integrations** (10 models): EmailAccount, EmailIntegration, CalendarIntegration, CalendarEvent, SalesforceSync, NotionIntegration, SlackIntegration, IntegrationCredential, ApollioUsage, Webhook
  - **Analytics** (12 models): LeadScore, IntentScore, LifecycleStage, Attribution, Visitor, EmailTracking, WebsiteTracking, Forecast, Proposal, BuyingCommittee, Battlecard, Competitor
  - **Automation** (7 models): Workflow, WorkflowEnrollment, WorkflowAction, EmailAccount, Campaign, Sequence, LeadRecycling
  - **Additional** (11+ models): Notification, Referral, Attachment, Waitlist, FormSubmission, and more

### Multi-Tenancy Pattern
- Every resource scoped to `workspace` (Project model)
- Queries always filter by `workspace: workspaceId`
- Indexes on `{ workspace: 1, [field]: 1 }` for performance
- Data isolation enforced at route middleware level

### Indexing Strategy
- **Compound Indexes**: `{workspace: 1, email: 1}`, `{workspace: 1, createdAt: -1}`
- **Unique Constraints**: `{workspace: 1, email: 1}` (unique within workspace)
- **Performance Indexes**: On frequently queried fields (status, stage, owner, tags)
- **Text Indexes**: On search fields (name, description, notes)

## 7. Event-Driven Architecture (BullMQ)

### Queue System
Clianta uses **BullMQ** (Bull v5) for:
- **Background Jobs**: Long-running tasks (email sync, Salesforce sync)
- **Scheduled Jobs**: Cron-based automation (daily insights, score decay)
- **Event Processing**: Asynchronous CRM events (contact created → trigger workflow)
- **Reliability**: Automatic retries, dead letter queues, persistence

### Queue Names
```typescript
QUEUE_NAMES = {
  CRM_EVENTS: 'crm-events',           // Primary event queue
  CRM_EVENTS_DLQ: 'crm-events-dlq',   // Failed event fallback
  WORKFLOW_BRIDGE: 'crm-workflow-bridge', // Workflow trigger queue
  ACTIVITY_LOG: 'crm-activity-log',   // Activity tracking queue
}
```

### Queue Configuration (Upstash-Optimized)
```typescript
// Reduced Redis requests for Upstash free tier
concurrency: 3,                       // Process 3 jobs concurrently
maxJobsPerSecond: 5,                  // Rate limit: 5 jobs/second
drainDelay: 30000,                    // Poll every 30s when empty
stalledInterval: 60000,               // Check stalled jobs every 60s
lockDuration: 60000,                  // 60s job lock
```

### Event Flow
```
CRM Event (e.g., Contact Created)
   ↓
EventPublisher.publish()
   ↓
BullMQ Queue (crm-events)
   ↓
EventConsumer.processEvent()
   ↓
[Actions: Trigger Workflow, Update Score, Send Notification]
```

### Background Jobs (9+ Scheduled Jobs)
- **Email Sync**: Every 5 minutes - Sync emails from Gmail/Outlook
- **Salesforce Sync**: Every 15 minutes - Bi-directional CRM sync
- **Contact Sync**: Daily 2 AM - Update contact data from integrations
- **Intent Score Decay**: Daily 2 AM - Reduce intent scores over time
- **Lifecycle Progression**: Every 2 hours - Auto-progress lead stages
- **Lead Recycling**: Daily 9 AM - Re-engage cold leads
- **Meeting Prep**: 30 min before meetings - AI-generated briefings
- **Stale Deal Alerts**: Daily 9 AM - Alert on inactive deals
- **Daily Insights**: Daily 8 AM - AI-generated workspace insights

**Note**: Background jobs currently disabled in development due to Redis rate limits (Upstash free tier). Enable in production with appropriate Redis instance.

## 8. Multi-Agent AI System

### Architecture
```
User Request
   ↓
SupervisorV2 (Entry point)
   ↓
Complexity Analyzer (Assess task complexity)
   ↓
┌─────────────┬─────────────┐
│ Simple Task │ Complex Task│
└──────┬──────┴─────┬───────┘
       │            │
   Single Agent  Execution Planner
       │            ↓
       │      Multi-Agent Coordinator
       │            ↓
       │      2-4 Agents (Parallel/Sequential)
       │            │
       └────────────┘
              ↓
        Result Aggregation
```

### Agent Ecosystem (24 Workers)
**Location**: `backend/src/chatbot/workers/`

See `AGENT_SYSTEM.md` for detailed documentation.

**Categories**:
- **Briefing & Analysis**: briefingAgent, forecastAgent, hygieneAgent
- **CRM Operations**: contactAgent, companyAgent, dealAgent
- **Marketing**: campaignAgent, emailAgent, sequenceAgent, landingPageAgent
- **Automation**: workflowAgent, schedulingAgent, taskAgent
- **Intelligence**: dataEntryAgent, leadScoreAgent, competitorAgent, reportsAgent
- **Specialized**: proposalAgent, transcriptionAgent, ticketAgent, pipelineAgent, dynamicAgent, generalAgent

### Coordination Strategies
- **Parallel Execution**: Multiple agents work simultaneously (e.g., contact + company + deal analysis)
- **Sequential Execution**: Agents work in order (e.g., data extraction → validation → storage)
- **Predefined Plans**: Complex workflows (meeting_prep, campaign_creation, deal_analysis)

## 9. Real-Time Communication (Socket.io)

### WebSocket Architecture
- **Server**: Socket.io 4.8.3 on HTTP server (not Express directly)
- **Client**: Socket.io Client 4.8.3 in Next.js app
- **Namespaces**: Currently one default namespace
- **Rooms**: Chat conversations (room per conversation ID)

### Use Cases
- **Chat System**: Real-time messaging between users
- **Notifications**: Live notification delivery
- **Presence**: Online/offline status (future)
- **Collaborative Editing**: Real-time workflow/form updates (future)

### Connection Flow
```
1. Frontend connects on workspace load
2. Socket authenticates with JWT from cookie
3. User joins workspace-specific rooms
4. Server broadcasts events to room members
5. Graceful disconnect/reconnect handling
```

## 10. Security Architecture

### Authentication Flow
```
1. User submits credentials (email/password or Google OAuth)
2. Passport strategy validates credentials
3. Server generates JWT token (7 day expiry)
4. JWT stored in httpOnly cookie
5. Frontend sends JWT in Authorization header
6. Passport-JWT middleware validates on each request
7. User object attached to req.user
```

### Authorization Pattern
- **Workspace-level**: Verify user has access to workspace (team membership)
- **Resource-level**: Verify ownership or team permission
- **Role-based**: Owner, Admin, Member permissions (in Team model)

### Security Layers
- **Rate Limiting**: 100 req/15min (general), 5 req/15min (auth endpoints)
- **Input Validation**: Zod schemas on all API endpoints
- **NoSQL Injection Prevention**: express-mongo-sanitize
- **XSS Protection**: React auto-escaping + sanitization on user content
- **CSRF**: Not needed (JWT in header, not cookie-based CSRF flow)
- **CORS**: Whitelist of allowed origins (clianta.online, localhost)
- **Environment Secrets**: All sensitive data in .env (never committed)
- **Credential Encryption**: IntegrationCredential model encrypts OAuth tokens

## 11. Design Patterns

### Service Layer Pattern
- **Separation of Concerns**: Routes handle HTTP, services handle business logic
- **Testability**: Services can be unit tested independently
- **Reusability**: Services used by routes, background jobs, agents

### Repository Pattern (Implicit via Mongoose)
- **Data Access Abstraction**: Mongoose models encapsulate DB queries
- **Schema Validation**: Mongoose schemas enforce data integrity
- **Middleware Hooks**: pre/post save hooks for business logic

### Event Publisher/Subscriber
- **Decoupling**: Event publishers don't know about consumers
- **Scalability**: Add new consumers without changing publishers
- **Reliability**: BullMQ persists events, retries failures

### Multi-Agent Coordination
- **Supervisor Pattern**: SupervisorV2 delegates to worker agents
- **Strategy Pattern**: Different execution strategies (single, parallel, sequential)
- **Observer Pattern**: Agents report progress to coordinator

### Middleware Chain Pattern
- **Express Middleware**: Sequential processing (CORS → Auth → Rate Limit → Business Logic)
- **Passport Strategies**: Pluggable authentication mechanisms
- **Error Handling**: Centralized error middleware (Sentry, 404, 500)

## 12. Data Flow Patterns

### Typical CRM Workflow
```
1. User creates contact in UI (Next.js form)
   ↓
2. POST /api/workspaces/:id/contacts (Express route)
   ↓
3. Validation middleware (Zod schema)
   ↓
4. Authentication middleware (Passport JWT)
   ↓
5. Controller extracts data, calls service
   ↓
6. ContactService.create() - Business logic
   ↓
7. Mongoose Contact.create() - Save to MongoDB
   ↓
8. EventPublisher.publish('contact.created') - Emit event
   ↓
9. BullMQ queue processes event
   ↓
10. Trigger workflows, update scores, send notifications
   ↓
11. Response sent to frontend with created contact
   ↓
12. UI updates optimistically (React state)
```

### AI Agent Workflow
```
1. User asks AI: "Prepare for meeting with Acme Corp"
   ↓
2. POST /api/workspaces/:id/agents/chat
   ↓
3. SupervisorV2 receives request
   ↓
4. Complexity Analyzer: "Complex task, requires multiple agents"
   ↓
5. Execution Planner: Use 'meeting_prep' predefined plan
   ↓
6. Multi-Agent Coordinator: Execute in parallel
   ├── contactAgent: Get contact history
   ├── companyAgent: Get company insights
   ├── dealAgent: Get open opportunities
   └── competitorAgent: Get competitor analysis
   ↓
7. Result Aggregation: Combine agent outputs
   ↓
8. briefingAgent: Generate final briefing document
   ↓
9. Response with AI-generated meeting brief
   ↓
10. Frontend displays formatted brief
```

## 13. Scalability Considerations

### Current Architecture (Single Server)
- **Frontend**: Vercel auto-scaling (serverless Next.js)
- **Backend**: Single Express instance on Railway
- **Database**: MongoDB Atlas (auto-scaling)
- **Redis**: Upstash (auto-scaling)
- **Background Jobs**: Running on same backend instance

### Scaling Recommendations

#### Horizontal Scaling
- **Backend**: Add multiple Express instances behind load balancer
- **Session Management**: Already using Redis for sessions (stateless backend)
- **File Storage**: Move uploads to S3/GCS (currently local filesystem)
- **Socket.io**: Use Redis adapter for multi-server Socket.io

#### Vertical Scaling
- **MongoDB**: Upgrade to larger Atlas tier or dedicated cluster
- **Redis**: Upgrade to larger Upstash tier (currently has rate limits)
- **Backend**: Increase memory/CPU for TypeScript compilation

#### Service Separation
- **Worker Instances**: Separate backend for API vs background jobs
- **Agent Service**: Dedicated service for AI agent processing
- **Queue Workers**: Dedicated instances for BullMQ workers

## 14. Deployment Architecture

### Current Setup
```
Frontend (Vercel)
  ↓ HTTPS
Backend (Railway)
  ↓
MongoDB Atlas    Redis (Upstash)
```

### Recommended Production Setup
```
┌─────────────────┐
│   Vercel CDN    │ Frontend (Next.js SSR)
└────────┬────────┘
         │ HTTPS
    ┌────┴────┐
    │   LB    │ Load Balancer (Railway/AWS ALB)
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───┴────┐          ┌─────┴────┐
│ API 1  │          │ Worker 1 │ Background Jobs
└───┬────┘          └─────┬────┘
    │                     │
    ├─────────────────────┘
    │
┌───┴─────────┬──────────────┬────────────┐
│             │              │            │
│  MongoDB    │   Redis      │    S3      │
│  Atlas      │  (Upstash)   │  (Files)   │
└─────────────┴──────────────┴────────────┘
```

## 15. Development Workflow

### Local Development
```bash
# Terminal 1: Start backend (port 5000)
cd backend && npm run dev

# Terminal 2: Start frontend (port 3000)
cd frontend && npm run dev

# OR use root concurrently script:
npm run dev  # Starts both frontend + backend
```

### Environment Setup
- Backend: `backend/.env` (MongoDB, Redis, API keys)
- Frontend: `frontend/.env.local` (NEXT_PUBLIC_API_URL)
- Google Credentials: `backend/vertex-key.json` (for AI features)

### Build Process
```bash
# Backend (TypeScript → JavaScript)
cd backend && npm run build  # Output: dist/

# Frontend (Next.js optimization)
cd frontend && npm run build  # Output: .next/

# Production start
cd backend && npm start  # node dist/server.js
cd frontend && npm start  # next start
```

## Summary

Clianta is a **production-grade, enterprise CRM** built with modern architecture patterns:

- **Monorepo**: Single codebase for coordinated development
- **Type-Safe**: End-to-end TypeScript from frontend to backend
- **Event-Driven**: Asynchronous, scalable event processing
- **AI-Native**: 24 specialized agents (`backend/src/chatbot/`) with custom multi-agent coordination
- **Real-Time**: WebSocket-based chat and notifications
- **Secure**: Multi-layered security (auth, rate limiting, validation)
- **Scalable**: Designed for horizontal scaling and service separation
- **Database**: 79 Mongoose models including 8 legacy/archived models preserved for recovery

**Next Steps for Production**:
1. Separate worker instances for background jobs
2. Migrate file uploads to S3/GCS
3. Implement Redis adapter for multi-server Socket.io
4. Set up CI/CD pipeline (GitHub Actions)
5. Configure monitoring (Sentry + custom metrics)
6. Load testing and performance optimization

For detailed documentation on specific subsystems, see:
- [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) - Multi-agent AI architecture
- [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md) - Queue system and scheduled jobs
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Third-party API integrations
- [MODELS_AND_SCHEMAS.md](./MODELS_AND_SCHEMAS.md) - Database schema reference
