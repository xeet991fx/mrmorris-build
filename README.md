# Clianta - AI-Native CRM That Builds Itself

> **Note**: This repository uses "mrmorris" in folder/package names (legacy from product pivot). The product name is **Clianta**.

An intelligent AI-native CRM powered by autonomous AI agents. Built with Google Gemini 2.5 Pro and DeepAgents framework, Clianta features multi-agent coordination, workflow automation, and AI-driven insights where agents work side-by-side with humans to execute complex CRM tasks autonomously.

**Live**: https://clianta.online

**Last Updated**: February 2, 2026

## 🚀 Overview

**Clianta** is an AI-native CRM that understands your business, knows your customers, and works like your best employee. Built with Google Gemini 2.5 Pro, DeepAgents framework, and multi-agent coordination architecture, it provides deep context awareness, autonomous task execution, workflow automation, and proactive insights across sales and customer success.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Validation**: React Hook Form + Zod
- **Charts**: Chart.js, Recharts
- **Email Editor**: React Email Editor (Unlayer)
- **Drag & Drop**: @dnd-kit, ReactFlow
- **Real-time**: Socket.io (Chat, notifications)

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Cache**: Redis (sessions, rate limiting)
- **Queue**: BullMQ (background jobs, scheduled tasks)
- **AI Provider**: Google Gemini 2.5 Pro (via @google/generative-ai)
- **AI Orchestration**: LangChain + @langchain/google-vertexai
- **Agent Framework**: DeepAgents (Multi-agent coordination)
- **Authentication**: Passport.js (JWT, Local, Google OAuth)
- **Validation**: Zod
- **File Upload**: Multer with Sharp (image processing)
- **Email**: Nodemailer + Resend
- **SMS**: Twilio
- **Scheduling**: node-cron (automated tasks)
- **Real-time**: Socket.io

### Integrations
- **Email**: Gmail, Outlook, SMTP/IMAP
- **Calendar**: Google Calendar
- **Communication**: Slack, Twilio (SMS)
- **Productivity**: Notion, Google Sheets
- **Enrichment**: Apollo.io (contact data enrichment)
- **Payments**: Stripe (planned)

## 📚 Documentation

Comprehensive documentation for production deployment and repository restructuring:

### Architecture & Design
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design, technology stack, and architectural patterns
- **[Folder Structure](docs/FOLDER_STRUCTURE.md)** - Repository organization and recommended production structure
- **[API Routes Map](docs/API_ROUTES_MAP.md)** - Complete API endpoint reference (200+ endpoints)

### Data & Models
- **[Models & Schemas](docs/MODELS_AND_SCHEMAS.md)** - Database schema documentation (70+ MongoDB models)
- **[Dependencies](docs/DEPENDENCIES.md)** - Package dependency catalog and version management

### AI & Automation
- **[Agent System](docs/AGENT_SYSTEM.md)** - Multi-agent AI architecture (23 specialized agents)
- **[Background Jobs](docs/BACKGROUND_JOBS.md)** - Queue system and scheduled tasks (9 jobs)

### Integrations & Configuration
- **[Integrations Guide](docs/INTEGRATIONS.md)** - Third-party integrations (Salesforce, Apollo, Google, Slack, etc.)
- **[Environment Configuration](docs/ENVIRONMENT_CONFIGURATION.md)** - Environment variables and setup guide
- **[Tracking SDK](docs/TRACKING_SDK.md)** - Website visitor tracking SDK documentation

### Deployment & Migration
- **[Build & Deployment](docs/BUILD_AND_DEPLOYMENT.md)** - Build process and production deployment guide
- **[Restructure Checklist](docs/RESTRUCTURE_CHECKLIST.md)** - Step-by-step repository restructuring guide
- **[Migration Notes](docs/MIGRATION_NOTES.md)** - Template for tracking migration decisions

**Quick Start**: See [Environment Configuration](docs/ENVIRONMENT_CONFIGURATION.md) for setup instructions.

## 📁 Project Structure

```
morrisB/
├── frontend/                           # Next.js Frontend Application
│   ├── app/                           # App Router pages
│   │   ├── auth/                      # OAuth callback routes
│   │   ├── dashboard/                 # Main dashboard
│   │   ├── forms/                     # Public form routes
│   │   ├── invite/                    # Team invite pages
│   │   ├── login/                     # Login page
│   │   ├── register/                  # Registration page
│   │   ├── meet/                      # Meeting scheduling
│   │   ├── p/                         # Public pages
│   │   ├── projects/                  # Workspace routes
│   │   │   └── [id]/                  # Dynamic workspace routes
│   │   │       ├── agents/            # AI agents management
│   │   │       ├── analytics/         # Analytics & reports
│   │   │       ├── campaigns/         # Email campaigns
│   │   │       ├── chatbots/          # AI chatbot builder
│   │   │       ├── companies/         # Company management
│   │   │       ├── contacts/          # Contact management
│   │   │       ├── dashboard/         # Workspace dashboard
│   │   │       ├── email-accounts/    # Email account settings
│   │   │       ├── email-templates/   # Email template builder
│   │   │       ├── forms/             # Form builder
│   │   │       ├── inbox/             # Unified inbox
│   │   │       ├── meetings/          # Meeting management
│   │   │       ├── pages/             # Landing page builder
│   │   │       ├── pipelines/         # Deal pipelines
│   │   │       ├── sequences/         # Email sequences
│   │   │       ├── settings/          # Workspace settings
│   │   │       ├── tasks/             # Task management
│   │   │       ├── workflows/         # Workflow automation
│   │   │       └── ...                # Other features
│   │   ├── sdk-test/                  # SDK testing page
│   │   └── verify-email/              # Email verification
│   ├── components/                    # React components
│   │   ├── agents/                    # Agent UI components
│   │   ├── analytics/                 # Analytics components
│   │   ├── chatbot/                   # Chatbot UI
│   │   ├── contacts/                  # Contact views
│   │   ├── dashboard/                 # Dashboard widgets
│   │   ├── forms/                     # Form builder
│   │   ├── landing/                   # Landing page sections
│   │   ├── layout/                    # Layout components
│   │   ├── settings/                  # Settings components
│   │   ├── ui/                        # shadcn/ui components
│   │   └── workflows/                 # Workflow builder
│   ├── hooks/                         # Custom React hooks
│   ├── lib/                           # Utilities & configurations
│   ├── store/                         # Zustand state stores
│   ├── types/                         # TypeScript type definitions
│   └── utils/                         # Utility functions
│
├── backend/                           # Express Backend Application
│   ├── src/
│   │   ├── agents/                   # AI agent implementations
│   │   ├── config/                   # Configuration files
│   │   ├── controllers/              # Route controllers
│   │   ├── errors/                   # Custom error classes
│   │   ├── events/                   # Event-driven architecture
│   │   ├── jobs/                     # Background jobs (BullMQ)
│   │   ├── middleware/               # Express middleware
│   │   ├── migrations/               # Database migrations
│   │   ├── models/                   # Mongoose models
│   │   ├── routes/                   # Express routes
│   │   ├── scripts/                  # Utility scripts
│   │   ├── seeds/                    # Database seeds
│   │   ├── services/                 # Business logic services
│   │   ├── socket/                   # Socket.io handlers
│   │   ├── tests/                    # Test files
│   │   ├── utils/                    # Utility functions
│   │   ├── validations/              # Zod validation schemas
│   │   ├── cluster.ts                # Cluster mode setup
│   │   └── server.ts                 # Express server setup
│   └── logs/                         # Application logs
│
├── sdk/                               # Tracking SDK
│   ├── src/                          # SDK source code
│   ├── examples/                     # Usage examples
│   └── tests/                        # SDK tests
│
├── integrations/                      # External integrations
│   └── wordpress/                    # WordPress plugin
│
├── docs/                             # Documentation
│   ├── AGENT_SYSTEM.md               # AI agent architecture
│   ├── API_ROUTES_MAP.md             # API endpoint reference
│   ├── ARCHITECTURE.md               # System architecture
│   ├── BACKGROUND_JOBS.md            # Background job docs
│   ├── BUILD_AND_DEPLOYMENT.md       # Deployment guide
│   ├── DEPENDENCIES.md               # Package dependencies
│   ├── ENVIRONMENT_CONFIGURATION.md  # Environment setup
│   ├── FOLDER_STRUCTURE.md           # Project structure
│   ├── INTEGRATIONS.md               # Integration guides
│   ├── MODELS_AND_SCHEMAS.md         # Database schemas
│   └── TRACKING_SDK.md               # SDK documentation
│
├── agent-os/                         # Agent OS framework
│   ├── standards/                    # Development standards
│   └── config.yml                    # Agent configuration
│
├── _bmad/                            # BMAD framework configs
│   ├── bmm/                          # Business model configs
│   └── core/                         # Core configurations
│
├── _bmad-output/                     # Generated artifacts
│
├── docker-compose.yml                # Docker compose config
├── package.json                      # Root package for scripts
└── README.md                         # This file
```

## ⚙️ Setup Instructions

### 1. Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **MongoDB**: Local installation or MongoDB Atlas account
- **Redis**: Local installation or Redis Cloud account
- **Google Cloud**: Vertex AI API enabled
- **Git**: For version control

### 2. Clone Repository

```bash
git clone <repository-url>
cd mrmorris-build
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

Or use the convenient script:
```bash
npm run install:all
```

### 4. Configure Environment Variables

#### Frontend (.env.local in frontend/)

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Next.js App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Backend (.env in backend/)

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mrmorris
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mrmorris

# Redis
REDIS_URL=redis://localhost:6379
# Or Redis Cloud:
# REDIS_URL=redis://username:password@redis-host:port

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google Cloud / Vertex AI
GOOGLE_PROJECT_ID=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./vertex-key.json
# Or base64 encoded (for production):
# GOOGLE_CREDENTIALS_BASE64=<base64-encoded-service-account-json>

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Sentry (Optional - Error tracking)
SENTRY_DSN=your-sentry-dsn

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### 5. Google Cloud Setup

#### For Vertex AI (Required for AI features):

1. Create a Google Cloud project
2. Enable Vertex AI API
3. Create a service account with Vertex AI User role
4. Download service account key as `vertex-key.json`
5. Place in `backend/` directory (gitignored)

### 6. Set Up Databases

#### MongoDB
```bash
# Local MongoDB
net start MongoDB  # Windows
brew services start mongodb-community  # macOS
sudo systemctl start mongod  # Linux

# Or use MongoDB Atlas (recommended for production)
```

#### Redis
```bash
# Local Redis
redis-server  # All platforms

# Or use Redis Cloud (recommended for production)
```

### 7. Run Development Servers

#### Run both frontend and backend:
```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Bull Board (Job Queue UI): http://localhost:5000/admin/queues

#### Or run separately:
```bash
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - Backend
npm run dev:backend
```

### 8. Available Scripts

```bash
# Development
npm run dev              # Run both frontend and backend
npm run dev:frontend     # Run only frontend
npm run dev:backend      # Run only backend

# Production
npm run build            # Build both frontend and backend
npm run start            # Start both in production mode
npm run start:frontend   # Start only frontend
npm run start:backend    # Start only backend

# Installation
npm run install:all      # Install all dependencies
```

## ✨ Key Features

### Core CRM
- **Contact Management**: Rich contact profiles with Apollo enrichment and data verification
- **Company Management**: Account-based tracking with company insights
- **Deal Pipeline**: Visual kanban with custom stages and AI-powered scoring
- **Activity Tracking**: Emails, calls, meetings, notes with full history
- **Lead Scoring**: Automated A-F grade scoring with decay rules and distribution analytics
- **Custom Fields**: Flexible data model for contacts, companies, and deals
- **Data Stewardship**: Automated data quality checks and verification

### AI-Powered (Multi-Agent Architecture)
- **Autonomous Agents**: 20+ specialized AI agents (contact, deal, campaign, briefing, etc.)
- **Multi-Agent Coordination**: Dynamic 2-4 agent collaboration for complex tasks
- **AI Assistant**: Natural language queries with intelligent routing
- **AI Memory**: Context-aware knowledge base with workspace context
- **AI Content**: Generate emails, campaigns, and responses with Gemini
- **Lead Scoring**: Automated behavioral scoring with intent analysis
- **Meeting Preparation**: Multi-agent briefings combining contact, deal, and company intel
- **Proactive Insights**: Automated deal health, forecast generation, competitive analysis

### Automation
- **Visual Workflow Builder**: Drag-and-drop editor with triggers and actions
- **Email Sequences**: Multi-step automated drip campaigns
- **Cold Email Outreach**: SMTP/IMAP configuration for outbound campaigns
- **Email Warmup**: Automated warmup activities to improve deliverability
- **Unified Inbox**: Centralized inbox for replying to campaign responses
- **Lead Recycling**: Re-engage cold leads automatically
- **Lifecycle Stages**: Automatic progression tracking with smart triggers
- **Scheduled Jobs**: Background automation with BullMQ and node-cron

### Integrations & Enrichment
- **Email**: Gmail OAuth, Outlook, SMTP/IMAP with full sync
- **Calendar**: Google Calendar integration for scheduling
- **Salesforce**: Bi-directional CRM sync with field mapping
- **Slack**: Notifications, alerts, and team collaboration
- **Notion**: Knowledge base and documentation sync
- **Google Sheets**: Data import/export with spreadsheet integration
- **Apollo.io**: Contact enrichment, verification, and job change tracking
- **Twilio**: SMS integration for outreach and notifications

### Lead Generation & Marketing
- **Email Campaigns**: Multi-channel campaign creation and scheduling
- **Campaign Analytics**: Open rate, click rate, reply rate, bounce tracking
- **Email Templates**: Template creation with variable substitution
- **Form Builder**: AI-powered form creation with intelligence (planned)
- **Landing Pages**: Embeddable landing page builder (planned)
- **Chatbot**: AI chatbot with qualification logic (planned)
- **Website Tracking**: Visitor identification and tracking (planned)

### Analytics & Insights
- **Dashboard**: Real-time metrics, KPIs, and lead score distribution
- **Email Analytics**: Campaign performance with detailed tracking
- **Lead Score Analytics**: A-F grade distribution and trend analysis
- **Deal Health**: Automated deal hygiene and health scoring
- **Forecasting**: AI-powered revenue forecasting with multi-agent analysis
- **Reports**: Custom report builder with data visualization
- **Activity Analytics**: Email, call, and meeting tracking with sentiment analysis

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

#### Contacts
- `GET /api/workspaces/:id/contacts` - List contacts
- `POST /api/workspaces/:id/contacts` - Create contact
- `GET /api/workspaces/:id/contacts/:contactId` - Get contact
- `PUT /api/workspaces/:id/contacts/:contactId` - Update contact
- `DELETE /api/workspaces/:id/contacts/:contactId` - Delete contact

#### Opportunities
- `GET /api/workspaces/:id/opportunities` - List deals
- `POST /api/workspaces/:id/opportunities` - Create deal
- `PUT /api/workspaces/:id/opportunities/:oppId` - Update deal

#### AI Features
- `POST /api/ai-content/generate-form` - Generate form with AI
- `POST /api/ai-content/generate-email` - Generate email with AI
- `GET /api/workspaces/:id/ai-memory` - View AI memory
- `POST /api/workspaces/:id/agents` - Create AI agent

See `docs/API_DOCUMENTATION.md` for complete API reference.

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test
```

## 🚀 Deployment

### Vercel (Frontend)
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Railway (Backend - Recommended)
1. Connect GitHub repository
2. Add environment variables
3. Add MongoDB and Redis plugins
4. Deploy

### Other Platforms
- **Render**: Full-stack deployment
- **AWS**: EC2 + RDS + ElastiCache
- **Google Cloud**: Cloud Run + MongoDB Atlas

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Input validation with Zod
- MongoDB injection protection
- XSS protection

## 📊 Monitoring

- **Bull Board**: Job queue monitoring at `/admin/queues`
- **Sentry**: Error tracking and performance monitoring
- **Redis**: Cache and session management
- **MongoDB**: Data persistence

## 🗺️ Roadmap & Status

### Phase 1: Core CRM ✅ Complete
- ✅ Contacts, Companies, Deals management
- ✅ Custom fields and data model
- ✅ Pipelines with visual kanban
- ✅ Authentication (JWT, OAuth, email verification)

### Phase 2: Marketing Automation ✅ Complete
- ✅ Email campaigns and sequences
- ✅ Email templates and unified inbox
- ✅ Cold email outreach with warmup
- ✅ Campaign analytics and tracking

### Phase 3: Workflows & Automation ✅ Complete
- ✅ Visual workflow builder
- ✅ Triggers and actions system
- ✅ Enrollment and scheduling logic
- ✅ Background job processing

### Phase 4: AI & Agents ✅ Complete
- ✅ 20+ specialized AI agents
- ✅ Multi-agent coordination (2-4 agents)
- ✅ DeepAgents framework integration
- ✅ AI-powered meeting prep and briefings
- ✅ Lead scoring with decay rules
- ✅ Agent test mode with step-by-step preview

### Phase 5: Integrations ✅ Complete
- ✅ Salesforce bi-directional sync
- ✅ Apollo.io enrichment
- ✅ Google Calendar, Sheets, Gmail OAuth
- ✅ Slack and Twilio
- ✅ Email integration (OAuth popup pattern)

### Phase 6: Advanced Features ✅ Complete
- ✅ Lead score analytics
- ✅ Data stewardship and verification
- ✅ Form and landing page builder
- ✅ Website visitor tracking SDK
- ✅ Meeting scheduling system
- ✅ Forecasting and ML scoring

### Phase 7: Production Ready 🚀 Current
- ✅ Docker deployment configuration
- ✅ Comprehensive documentation
- ⏳ Performance optimization
- ⏳ Extended API documentation
- ⏳ Developer SDK improvements

## 📝 Documentation

### Core Documentation
- [Architecture](docs/ARCHITECTURE.md) - System architecture overview
- [API Routes Map](docs/API_ROUTES_MAP.md) - Complete API endpoint reference
- [Models & Schemas](docs/MODELS_AND_SCHEMAS.md) - Database schema documentation
- [Folder Structure](docs/FOLDER_STRUCTURE.md) - Project organization

### AI & Automation
- [Agent System](docs/AGENT_SYSTEM.md) - AI agent system documentation
- [Background Jobs](docs/BACKGROUND_JOBS.md) - Queue and scheduled tasks

### Integrations & SDK
- [Integrations Guide](docs/INTEGRATIONS.md) - Third-party integration guides
- [Tracking SDK](docs/TRACKING_SDK.md) - Website visitor tracking SDK
- [Environment Config](docs/ENVIRONMENT_CONFIGURATION.md) - Environment setup

### Deployment
- [Build & Deployment](docs/BUILD_AND_DEPLOYMENT.md) - Production deployment guide
- [Dependencies](docs/DEPENDENCIES.md) - Package dependency management

## 🤝 Contributing

This is a private project. For access or questions, contact the development team.

## 📄 License

Proprietary software for Clianta.

---


**Version**: 0.1.0 | **Last Updated**: February 2026
