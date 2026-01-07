# MrMorris - AI-Native CRM Platform

An intelligent CRM system where AI agents and humans work side-by-side with full business context to execute work autonomously.

## 🚀 Overview

MrMorris is an AI-native CRM that understands your business, knows your customers, and works like your best employee. Built with Google Gemini 2.5 Pro and autonomous agent architecture, it provides deep context awareness and proactive execution across sales, support, and customer success.

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
- **Real-time**: Socket.io (Chat, notifications)

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Cache**: Redis (sessions, rate limiting)
- **Queue**: BullMQ (background jobs)
- **AI Provider**: Google Gemini 2.5 Pro (via Vertex AI)
- **AI Orchestration**: LangChain + @langchain/google-vertexai
- **Authentication**: Passport.js (JWT, Local, Google OAuth)
- **Validation**: Zod
- **File Upload**: Multer
- **Email**: Nodemailer + Resend
- **Real-time**: Socket.io

### Integrations
- **CRM**: Salesforce
- **Email**: Gmail, Outlook
- **Calendar**: Google Calendar
- **Communication**: Slack, Twilio
- **Productivity**: Notion, Google Sheets
- **Payments**: Stripe (planned)

## 📁 Project Structure

```
mrmorris-build/
├── frontend/                           # Next.js Frontend Application
│   ├── app/                           # App Router pages
│   │   ├── (auth)/                   # Authentication routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (workspace)/              # Main workspace routes
│   │   │   ├── contacts/             # Contact management
│   │   │   ├── companies/            # Company management
│   │   │   ├── deals/                # Deal/opportunity pipeline
│   │   │   ├── activities/           # Activity tracking
│   │   │   ├── analytics/            # Analytics & reports
│   │   │   ├── workflows/            # Workflow automation
│   │   │   ├── campaigns/            # Email campaigns
│   │   │   ├── forms/                # Form builder
│   │   │   ├── chatbot/              # AI chatbot builder
│   │   │   ├── tracking/             # Website tracking
│   │   │   └── settings/             # Workspace settings
│   │   ├── dashboard/                # Main dashboard
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing page
│   ├── components/                    # React components
│   │   ├── analytics/                # Analytics components
│   │   ├── chatbot/                  # Chatbot UI
│   │   ├── contacts/                 # Contact views
│   │   ├── dashboard/                # Dashboard widgets
│   │   ├── deals/                    # Deal kanban & views
│   │   ├── forms/                    # Form builder
│   │   ├── landing/                  # Landing page sections
│   │   ├── layout/                   # Layout components
│   │   ├── shared/                   # Shared components
│   │   ├── ui/                       # shadcn/ui components
│   │   └── workflows/                # Workflow builder
│   ├── lib/                          # Utilities & configurations
│   │   ├── api/                      # API client functions
│   │   ├── validations/              # Zod validation schemas
│   │   ├── axios.ts                  # Axios instance
│   │   └── utils.ts                  # Utility functions
│   ├── store/                        # Zustand state stores
│   │   ├── useAuthStore.ts           # Auth state
│   │   ├── useWorkspaceStore.ts      # Workspace state
│   │   └── useThemeStore.ts          # Theme state
│   ├── .env.local                    # Frontend environment variables
│   └── package.json                  # Frontend dependencies
│
├── backend/                           # Express Backend Application
│   ├── src/
│   │   ├── config/                   # Configuration files
│   │   │   ├── database.ts           # MongoDB connection
│   │   │   ├── passport.ts           # Passport auth strategies
│   │   │   └── redis.ts              # Redis connection
│   │   ├── models/                   # Mongoose models
│   │   │   ├── User.ts               # User model
│   │   │   ├── Project.ts            # Workspace/project model
│   │   │   ├── Contact.ts            # Contact model
│   │   │   ├── Company.ts            # Company model
│   │   │   ├── Opportunity.ts        # Deal/opportunity model
│   │   │   ├── Activity.ts           # Activity model
│   │   │   ├── Workflow.ts           # Workflow model
│   │   │   ├── Campaign.ts           # Campaign model
│   │   │   ├── Form.ts               # Form model
│   │   │   ├── Chatbot.ts            # Chatbot model
│   │   │   ├── AIMemory.ts           # AI memory/context model
│   │   │   └── ...                   # Other models
│   │   ├── routes/                   # Express routes
│   │   │   ├── auth.ts               # Authentication
│   │   │   ├── contact.ts            # Contacts CRUD
│   │   │   ├── company.ts            # Companies CRUD
│   │   │   ├── opportunity.ts        # Deals/opportunities
│   │   │   ├── workflow.ts           # Workflows
│   │   │   ├── campaign.ts           # Email campaigns
│   │   │   ├── form.ts               # Forms
│   │   │   ├── chatbot.ts            # Chatbot
│   │   │   ├── analytics.ts          # Analytics
│   │   │   ├── agent.ts              # AI agents
│   │   │   ├── aiMemory.ts           # AI memory
│   │   │   ├── aiContent.ts          # AI content generation
│   │   │   └── integrations/         # Integration routes
│   │   │       ├── googleSheets.ts
│   │   │       ├── notion.ts
│   │   │       └── slack.ts
│   │   ├── services/                 # Business logic services
│   │   │   ├── AIMemoryService.ts    # AI memory & context
│   │   │   ├── AIContentService.ts   # AI content generation
│   │   │   ├── IntentScoreService.ts # Intent scoring
│   │   │   ├── EnrichmentService.ts  # Data enrichment
│   │   │   ├── WorkflowScheduler.ts  # Workflow execution
│   │   │   ├── EmailService.ts       # Email sending
│   │   │   ├── SalesforceService.ts  # Salesforce sync
│   │   │   └── ...                   # Other services
│   │   ├── jobs/                     # Background jobs
│   │   │   ├── emailSyncJob.ts       # Email sync
│   │   │   ├── salesforceSyncJob.ts  # Salesforce sync
│   │   │   ├── intentScoreDecayJob.ts
│   │   │   ├── lifecycleProgressionJob.ts
│   │   │   ├── leadRecyclingJob.ts
│   │   │   ├── meetingPrepJob.ts     # AI meeting prep
│   │   │   ├── dailyInsightJob.ts    # AI insights
│   │   │   └── proactiveAI/          # Proactive AI jobs
│   │   ├── middleware/               # Express middleware
│   │   │   └── auth.ts               # Auth middleware
│   │   ├── events/                   # Event-driven architecture
│   │   │   ├── consumers/            # Event consumers
│   │   │   ├── queue/                # Queue management
│   │   │   └── types.ts              # Event types
│   │   ├── socket/                   # Socket.io handlers
│   │   │   └── chatSocket.ts         # Real-time chat
│   │   ├── validations/              # Zod validation schemas
│   │   ├── types/                    # TypeScript types
│   │   └── server.ts                 # Express server setup
│   ├── .env                          # Backend environment variables
│   ├── vertex-key.json               # Google Cloud credentials (gitignored)
│   ├── tsconfig.json                 # TypeScript config
│   └── package.json                  # Backend dependencies
│
├── agent-os/                          # Agent OS framework
│   ├── standards/                    # Development standards
│   │   ├── frontend/                 # Frontend guidelines
│   │   └── backend/                  # Backend guidelines
│   └── workflows/                    # Workflow definitions
│
├── docs/                             # Documentation
│   ├── API_DOCUMENTATION.md          # API docs
│   ├── INTEGRATION_STATUS.md         # Integration status
│   ├── WORKFLOW_DATA_FLOW.md         # Workflow architecture
│   └── ...                           # Other docs
│
├── .env                              # Root environment variables
├── package.json                      # Root package for concurrent scripts
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
- **Contact Management**: Rich contact profiles with enrichment
- **Company Management**: Account-based tracking and insights
- **Deal Pipeline**: Visual kanban with AI-powered scoring
- **Activity Tracking**: Emails, calls, meetings, notes
- **Custom Fields**: Flexible data model for any business

### AI-Powered
- **AI Assistant**: Natural language queries and actions
- **AI Memory**: Context-aware knowledge base
- **AI Content**: Generate forms, emails, landing pages
- **Intent Scoring**: Behavioral analytics and lead scoring
- **Proactive Insights**: Meeting prep, stale deal alerts, daily summaries

### Automation
- **Workflows**: Visual workflow builder with triggers and actions
- **Sequences**: Automated email campaigns
- **Lead Recycling**: Re-engage cold leads automatically
- **Lifecycle Stages**: Automatic progression tracking

### Integrations
- **Email**: Gmail, Outlook sync
- **Calendar**: Google Calendar integration
- **Salesforce**: Bi-directional sync
- **Slack**: Notifications and team collaboration
- **Notion**: Knowledge base integration
- **Google Sheets**: Data import/export

### Lead Generation
- **Form Builder**: AI-powered form creation with intelligence
- **Landing Pages**: Embeddable landing page builder
- **Chatbot**: AI chatbot with qualification logic
- **Website Tracking**: Visitor identification and tracking

### Analytics
- **Dashboard**: Real-time metrics and KPIs
- **Reports**: Custom report builder
- **Forecasting**: AI-powered revenue forecasting
- **Attribution**: Multi-touch attribution tracking

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

## 🗺️ Roadmap

### Phase 1: Core Architecture (In Progress)
- ✅ Database schema design
- ✅ Authentication system
- ✅ Basic CRM features
- ⏳ AI Assistant core

### Phase 2: AI Assistant
- ⏳ Natural language interface
- ⏳ Context-aware actions
- ⏳ Proactive notifications

### Phase 3: Autonomous Agents
- ⏳ Document-to-agent parser
- ⏳ Agent execution engine
- ⏳ Multi-agent orchestration

### Phase 4: Advanced Features
- ⏳ Custom object builder
- ⏳ Data enrichment service
- ⏳ Lead discovery engine
- ⏳ Developer API

## 📝 Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Integration Status](docs/INTEGRATION_STATUS.md)
- [Workflow Architecture](docs/WORKFLOW_DATA_FLOW.md)
- [Lead Generation Guide](docs/LEAD_GENERATION_PLAN.md)
- [Production Deployment](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)

## 🤝 Contributing

This is a private project. For access or questions, contact the development team.

## 📄 License

Proprietary software for MrMorris.

---

Built with ❤️ using Google Gemini 2.5 Pro and Vertex AI
