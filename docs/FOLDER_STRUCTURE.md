# Clianta - Folder Structure & Organization

## Product Naming Note
- **Product Name**: Clianta (brand name, used in UI and documentation)
- **Codebase**: Uses "mrmorris" in folder/package names (legacy from product pivot)
- **Production Repo**: Recommended to use "clianta-production" when restructuring

---

## Current Monorepo Structure

```
mrmorris-build/                         # Root (legacy naming)
├── frontend/                           # Next.js 15 Application
├── backend/                            # Express API Server
├── agent-os/                           # Development Standards (Claude Code skills)
├── integrations/                       # Integration Helpers (WordPress)
├── docs/                               # Documentation (this folder)
├── package.json                        # Monorepo scripts (concurrently)
├── tsconfig.json                       # Root TypeScript config
└── .gitignore                          # Git ignore rules
```

---

## Frontend Structure (`frontend/`)

```
frontend/
├── app/                                # Next.js App Router
│   ├── (auth)/                         # Auth route group
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── dashboard/                      # Main dashboard
│   ├── projects/[id]/                  # Workspace routes (41 features)
│   │   ├── contacts/
│   │   ├── companies/
│   │   ├── pipelines/
│   │   ├── campaigns/
│   │   ├── sequences/
│   │   ├── workflows/
│   │   ├── forms/
│   │   ├── chatbots/
│   │   ├── email-accounts/
│   │   ├── email-templates/
│   │   ├── email-analytics/
│   │   ├── inbox/
│   │   ├── intent/
│   │   ├── lead-scores/
│   │   ├── meetings/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── [25+ more features...]
│   ├── layout.tsx                      # Root layout
│   ├── page.tsx                        # Landing page
│   └── globals.css
│
├── components/                         # React Components (36 directories)
│   ├── shared/                         # Reusable components
│   ├── ui/                             # shadcn/ui components
│   ├── analytics/, apollo/, auth/
│   ├── campaigns/, chat/, companies/
│   ├── contacts/, dashboard/
│   ├── email-accounts/, email-analytics/, email-templates/
│   ├── forms/, inbox/, intent/
│   ├── landing/, lead-scores/, meetings/
│   ├── pipelines/, projects/, reports/
│   ├── salesforce/, sequences/, settings/
│   └── workflows/
│
├── lib/                                # Utilities
│   ├── api/                            # API client functions
│   ├── validations/                    # Zod schemas
│   ├── utils/                          # Helper functions
│   ├── workflow/                       # Workflow helpers
│   ├── axios.ts                        # Axios instance
│   └── utils.ts
│
├── store/                              # Zustand Stores
│   ├── useAuthStore.ts
│   ├── useWorkspaceStore.ts
│   └── useThemeStore.ts
│
├── hooks/                              # Custom React Hooks
├── types/                              # TypeScript Types
├── public/                             # Static Assets
│   ├── track.js                        # Tracking script
│   ├── track.min.js                    # Minified tracking
│   └── forms/embed.js                  # Form embed script
│
├── .env.local                          # Frontend env vars
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript config
├── tailwind.config.ts                  # Tailwind configuration
└── next.config.js                      # Next.js configuration
```

**Total**: 12,000+ files (Next.js + node_modules)

---

## Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── config/                         # Configuration
│   │   ├── database.ts                 # MongoDB connection
│   │   ├── passport.ts                 # Auth strategies
│   │   └── redis.ts                    # Redis connection
│   │
│   ├── models/                         # Mongoose Models (70 files)
│   │   ├── User.ts, Project.ts
│   │   ├── Contact.ts, Company.ts, Opportunity.ts
│   │   ├── Campaign.ts, Workflow.ts, Form.ts
│   │   ├── AI*.ts                      # AI-related models
│   │   ├── *Integration.ts             # Integration models
│   │   └── [65+ more models...]       # See MODELS_AND_SCHEMAS.md
│   │
│   ├── routes/                         # Express Routes (60+ files)
│   │   ├── auth.ts
│   │   ├── contact.ts, company.ts, opportunity.ts
│   │   ├── workflow.ts, campaign.ts, sequence.ts
│   │   ├── agent.ts, aiContent.ts, aiMemory.ts
│   │   ├── integrations/               # Integration routes
│   │   │   ├── googleSheets.ts
│   │   │   ├── notion.ts
│   │   │   └── slack.ts
│   │   ├── workflow/                   # Workflow sub-routes
│   │   │   ├── dataSources.ts
│   │   │   └── fieldFetching.ts
│   │   └── [55+ more routes...]
│   │
│   ├── services/                       # Business Logic (55+ files)
│   │   ├── ai.service.ts
│   │   ├── AIMemoryService.ts
│   │   ├── ApolloService.ts
│   │   ├── CampaignService.ts
│   │   ├── EmailService.ts
│   │   ├── SalesforceService.ts
│   │   ├── WorkflowScheduler.ts
│   │   ├── leadScoring.ts
│   │   ├── workflow/                   # Workflow services
│   │   │   └── actions/                # 15+ action handlers
│   │   └── [50+ more services...]
│   │
│   ├── agents/                         # AI Agent System
│   │   ├── supervisor.ts               # Agent supervisor V1
│   │   ├── supervisorV2.ts             # Multi-agent coordinator
│   │   ├── complexityAnalyzer.ts       # Task complexity analysis
│   │   ├── executionPlanner.ts         # Execution planning
│   │   ├── coordinator.ts              # Multi-agent execution
│   │   ├── state.ts                    # Agent state management
│   │   ├── modelFactory.ts             # Gemini model factory
│   │   ├── workers/                    # Worker Agents (23 files)
│   │   │   ├── contactAgent.ts
│   │   │   ├── dealAgent.ts
│   │   │   ├── campaignAgent.ts
│   │   │   ├── briefingAgent.ts
│   │   │   └── [19 more agents...]    # See AGENT_SYSTEM.md
│   │   ├── tools/                      # Agent tools
│   │   ├── utils/                      # Agent utilities
│   │   ├── enhancers/                  # Agent enhancements
│   │   └── MULTI_AGENT_README.md       # Agent system docs
│   │
│   ├── jobs/                           # Background Jobs (9 files)
│   │   ├── emailSyncJob.ts
│   │   ├── salesforceSyncJob.ts
│   │   ├── intentScoreDecayJob.ts
│   │   ├── lifecycleProgressionJob.ts
│   │   ├── leadRecyclingJob.ts
│   │   ├── meetingPrepJob.ts
│   │   ├── dailyInsightJob.ts
│   │   ├── staleDealAlertJob.ts
│   │   └── proactiveAI.ts
│   │
│   ├── events/                         # Event-Driven System
│   │   ├── queue/
│   │   │   ├── QueueManager.ts
│   │   │   ├── queue.config.ts         # BullMQ configuration
│   │   │   └── index.ts
│   │   ├── publisher/                  # Event publishers
│   │   ├── consumers/                  # Event consumers
│   │   ├── schemas/                    # Event schemas
│   │   └── types.ts
│   │
│   ├── middleware/                     # Express Middleware
│   │   └── auth.ts                     # Authentication middleware
│   │
│   ├── socket/                         # Socket.io Handlers
│   │   └── chatSocket.ts               # Real-time chat
│   │
│   ├── validations/                    # Zod Validation Schemas
│   ├── types/                          # TypeScript Type Definitions
│   ├── utils/                          # Utility Functions
│   ├── scripts/                        # Utility Scripts
│   ├── seeds/                          # Database Seeding
│   ├── server.ts                       # Main Express Server (563 lines)
│   └── test-*.ts                       # Test Files
│
├── .env                                # Backend Environment Variables
├── vertex-key.json                     # Google Cloud Credentials (gitignored)
├── uploads/                            # File Uploads (gitignored)
├── package.json                        # Dependencies & Scripts
├── tsconfig.json                       # TypeScript Configuration
└── nodemon.json                        # Nodemon Configuration
```

**Total**: 323 TypeScript files

---

## Agent-OS Structure (`agent-os/`)

```
agent-os/
├── standards/                          # Development Standards
│   ├── backend/
│   │   ├── api.md
│   │   ├── migrations.md
│   │   ├── models.md
│   │   └── queries.md
│   ├── frontend/
│   │   ├── accessibility.md
│   │   ├── components.md
│   │   ├── css.md
│   │   └── responsive.md
│   ├── global/
│   │   ├── coding-style.md
│   │   ├── commenting.md
│   │   ├── conventions.md
│   │   ├── error-handling.md
│   │   ├── tech-stack.md
│   │   └── validation.md
│   └── testing/
│       └── test-writing.md
├── workflows/                          # Workflow Definitions
└── config.yml                          # Agent-OS Configuration
```

---

## Rationale for Current Structure

**Monorepo Benefits**:
- Shared TypeScript types between frontend/backend
- Single git history for coordinated releases
- Unified development workflow (`npm run dev`)
- Easier refactoring across stack

**Deep Nesting in `app/`**:
- Next.js 15 App Router convention
- File-based routing with route groups
- Workspace-scoped features under `projects/[id]/`

**Service Layer Pattern**:
- Business logic separated from routes
- Reusable across routes, jobs, agents
- Easier testing and maintenance

---

## Recommended Production Structure

For restructuring into a production-ready repository:

```
clianta-production/                     # Use brand name
├── apps/
│   ├── web/                            # Next.js Frontend
│   └── api/                            # Express Backend
│
├── packages/
│   ├── shared-types/                   # Shared TypeScript Types
│   ├── database-models/                # Mongoose Models
│   ├── ui-components/                  # Reusable UI Components (optional)
│   └── integrations/                   # Integration Clients
│
├── services/
│   ├── ai-agents/                      # Agent System (optional separation)
│   ├── queue-workers/                  # Background Jobs (optional separation)
│   └── event-processors/               # Event Consumers (optional separation)
│
├── docs/                               # All Documentation
│   ├── ARCHITECTURE.md
│   ├── DEPENDENCIES.md
│   ├── MODELS_AND_SCHEMAS.md
│   ├── AGENT_SYSTEM.md
│   ├── BACKGROUND_JOBS.md
│   ├── INTEGRATIONS.md
│   ├── ENVIRONMENT_CONFIGURATION.md
│   ├── BUILD_AND_DEPLOYMENT.md
│   ├── FOLDER_STRUCTURE.md
│   ├── API_ROUTES_MAP.md
│   ├── RESTRUCTURE_CHECKLIST.md
│   └── MIGRATION_NOTES.md
│
├── infrastructure/                     # IaC, Scripts (optional)
│   ├── terraform/ or pulumi/
│   ├── docker/
│   └── scripts/
│
├── .github/                            # CI/CD Workflows
├── package.json                        # Root Workspace Configuration
└── README.md                           # Updated Overview
```

**Benefits**:
- Clearer separation of concerns
- Independent deployment of services
- Easier onboarding for new developers
- Production-ready naming (uses "Clianta" brand)

---

## Migration Path

See [RESTRUCTURE_CHECKLIST.md](./RESTRUCTURE_CHECKLIST.md) for detailed migration steps.

**Key Considerations**:
1. Move shared types to `packages/shared-types`
2. Extract models to `packages/database-models`
3. Optional: Separate agent system into `services/ai-agents`
4. Optional: Separate background jobs into `services/queue-workers`
5. Update all import paths
6. Test builds for each package/service
7. Update CI/CD pipelines

---

## Summary

- **Current**: Monorepo with frontend/ and backend/ folders
- **Legacy Naming**: "mrmorris" in codebase (product is "Clianta")
- **Recommended**: Workspace-based monorepo with "clianta-production" naming
- **Migration**: Gradual restructuring with import path updates

For related documentation, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [RESTRUCTURE_CHECKLIST.md](./RESTRUCTURE_CHECKLIST.md) - Migration guide
- [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) - Build configuration
