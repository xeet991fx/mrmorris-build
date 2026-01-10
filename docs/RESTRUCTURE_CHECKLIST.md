# Clianta - Repository Restructuring Checklist

## Purpose

Step-by-step checklist for restructuring the Clianta repository from the current "mrmorris-build" development structure to a production-ready "clianta-production" repository.

---

## Phase 1: Preparation

- [ ] Read all documentation files in `docs/`
- [ ] Understand current dependencies (see DEPENDENCIES.md)
- [ ] Review all data models (see MODELS_AND_SCHEMAS.md)
- [ ] Document current API routes (see API_ROUTES_MAP.md)
- [ ] Identify shared code between frontend/backend
- [ ] List all environment variables (see ENVIRONMENT_CONFIGURATION.md)
- [ ] Document integration credentials and setup
- [ ] Create backup of current repository

---

## Phase 2: New Repository Setup

- [ ] Create new Git repository: `clianta-production`
- [ ] Initialize with appropriate `.gitignore` (Node, environment files)
- [ ] Set up branch protection rules (main branch)
- [ ] Configure repository settings (issues, wikis, etc.)
- [ ] Add LICENSE file (if applicable)
- [ ] Create initial README.md
- [ ] Set up workspace structure (monorepo or multi-repo decision)

**If Monorepo**:
- [ ] Initialize npm workspaces in root `package.json`
- [ ] Set up workspace configuration
- [ ] Configure TypeScript path mappings for workspaces

**If Multi-Repo**:
- [ ] Create separate repositories for frontend, backend, shared packages
- [ ] Set up cross-repo dependency management strategy

---

## Phase 3: Shared Packages (if monorepo)

### Create Shared Types Package
- [ ] Create `packages/shared-types/` directory
- [ ] Initialize package.json
- [ ] Move shared TypeScript interfaces from both frontend/backend
- [ ] Export all types via index.ts
- [ ] Configure tsconfig.json for shared types
- [ ] Test compilation

### Create Database Models Package
- [ ] Create `packages/database-models/` directory
- [ ] Move all Mongoose models from `backend/src/models/`
- [ ] Update imports to use shared package
- [ ] Configure Mongoose connection in package
- [ ] Test model compilation

### Create UI Components Package (Optional)
- [ ] Create `packages/ui-components/` directory
- [ ] Extract reusable components from `frontend/components/shared/`
- [ ] Set up build process (if needed)
- [ ] Configure storybook (optional)

---

## Phase 4: Frontend Migration

- [ ] Create `apps/web/` or `frontend/` directory
- [ ] Copy Next.js app structure
- [ ] Update `package.json` dependencies
- [ ] Update imports to use shared packages (if monorepo)
- [ ] Update all absolute import paths
- [ ] Verify all components render correctly
- [ ] Test build process: `npm run build`
- [ ] Update environment variables in `.env.local`
- [ ] Test development mode: `npm run dev`
- [ ] Verify API calls work with backend
- [ ] Test production build

---

## Phase 5: Backend Migration

- [ ] Create `apps/api/` or `backend/` directory
- [ ] Copy Express server structure
- [ ] Update `package.json` dependencies
- [ ] Update imports to use shared models package (if monorepo)
- [ ] Update all import paths
- [ ] Verify all routes compile
- [ ] Test TypeScript compilation: `npm run build`
- [ ] Update environment variables in `.env`
- [ ] Test server startup: `npm start`
- [ ] Verify database connection
- [ ] Verify Redis connection
- [ ] Test API endpoints with Postman/Thunder Client

---

## Phase 6: AI Agents Separation (Optional)

- [ ] Decide: Keep in backend OR separate to `services/ai-agents/`
- [ ] If separating:
  - [ ] Create `services/ai-agents/` directory
  - [ ] Move all agent files from `backend/src/agents/`
  - [ ] Update import paths in backend routes
  - [ ] Configure as separate service (optional independent deployment)
  - [ ] Test agent invocation from backend

---

## Phase 7: Background Jobs Separation (Optional)

- [ ] Decide: Keep in backend OR separate to `services/queue-workers/`
- [ ] If separating:
  - [ ] Create `services/queue-workers/` directory
  - [ ] Move all job files from `backend/src/jobs/`
  - [ ] Move queue configuration from `backend/src/events/`
  - [ ] Configure as separate worker service
  - [ ] Update job invocation in backend
  - [ ] Test job execution

---

## Phase 8: Integration Layer

- [ ] Decide: Keep integrations in backend OR extract to `packages/integrations/`
- [ ] If extracting:
  - [ ] Create `packages/integrations/` directory
  - [ ] Organize by integration type (Salesforce, Apollo, etc.)
  - [ ] Move integration services
  - [ ] Update backend imports
- [ ] Document all required credentials
- [ ] Test each integration independently

---

## Phase 9: Documentation Migration

- [ ] Copy all docs from `docs/` to new repo `docs/` folder
- [ ] Update all file paths in documentation to reflect new structure
- [ ] Update README.md with new repository name and structure
- [ ] Add CONTRIBUTING.md (if open-source or team collaboration)
- [ ] Add CODE_OF_CONDUCT.md (if applicable)
- [ ] Update all internal documentation links
- [ ] Review and update MIGRATION_NOTES.md with decisions made

---

## Phase 10: Infrastructure Setup (Optional)

### Docker Configuration
- [ ] Create Dockerfiles for frontend and backend
- [ ] Create docker-compose.yml for local development
- [ ] Test Docker builds
- [ ] Test docker-compose up

### Infrastructure as Code (Optional)
- [ ] Create `infrastructure/` directory
- [ ] Set up Terraform/Pulumi/CDK configurations
- [ ] Document infrastructure setup process

### Scripts
- [ ] Create `infrastructure/scripts/` for common tasks
- [ ] Add deployment scripts
- [ ] Add database migration scripts (if needed)
- [ ] Add setup/teardown scripts

---

## Phase 11: CI/CD Pipeline

### GitHub Actions (or chosen CI/CD)
- [ ] Create `.github/workflows/` directory
- [ ] Create frontend build/test workflow
- [ ] Create backend build/test workflow
- [ ] Create deployment workflows (staging + production)
- [ ] Set up environment secrets in GitHub
- [ ] Test CI/CD pipeline with test commits

---

## Phase 12: Testing

### Frontend Testing
- [ ] Test homepage loads
- [ ] Test authentication flow (login, register, logout)
- [ ] Test workspace creation
- [ ] Test contact management (CRUD)
- [ ] Test campaign creation
- [ ] Test workflow builder
- [ ] Test form builder
- [ ] Test AI agent chat
- [ ] Verify all 41 workspace features load

### Backend Testing
- [ ] Test server starts without errors
- [ ] Test database connection
- [ ] Test Redis connection
- [ ] Test all authentication endpoints
- [ ] Test core CRM endpoints (contacts, companies, deals)
- [ ] Test workflow triggers
- [ ] Test email sending
- [ ] Test background job execution (if enabled)
- [ ] Test AI agent invocation
- [ ] Test integration endpoints (Salesforce, Apollo, etc.)

### Integration Testing
- [ ] Test frontend → backend API calls
- [ ] Test file uploads
- [ ] Test real-time chat (Socket.io)
- [ ] Test tracking scripts
- [ ] Test form submissions
- [ ] Test email tracking (open, click)

---

## Phase 13: Deployment Preparation

### Database Setup
- [ ] Create MongoDB Atlas cluster (or chosen database)
- [ ] Create database user with appropriate permissions
- [ ] Configure IP whitelist (0.0.0.0/0 for cloud deployments)
- [ ] Test connection string
- [ ] Note: Indexes created automatically on first startup

### Redis Setup
- [ ] Create Upstash Redis instance (or chosen Redis provider)
- [ ] Copy connection string
- [ ] Test connection

### Google Cloud Setup (for AI)
- [ ] Verify GCP project exists
- [ ] Ensure Vertex AI API is enabled
- [ ] Create/verify service account
- [ ] Download service account JSON
- [ ] For production: Base64 encode and set as environment variable

### Environment Variables
- [ ] Set all backend environment variables in deployment platform
- [ ] Set all frontend environment variables in deployment platform
- [ ] Update FRONTEND_URL and BACKEND_URL to production URLs
- [ ] Configure OAuth redirect URIs in Google Cloud Console
- [ ] Set all integration API keys (Apollo, Twilio, Slack, etc.)
- [ ] Set encryption keys for credential storage
- [ ] Configure error tracking (Sentry DSN)

### Domain & SSL
- [ ] Purchase/configure domain (clianta.online)
- [ ] Set up DNS records
- [ ] Configure SSL certificates (usually automatic with Vercel/Railway)
- [ ] Update CORS origins in backend

---

## Phase 14: Production Deployment

### Frontend Deployment (Vercel recommended)
- [ ] Connect Vercel to new repository
- [ ] Configure build settings (root directory: `apps/web` or `frontend`)
- [ ] Set environment variables
- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Test frontend loads at production URL

### Backend Deployment (Railway recommended)
- [ ] Connect Railway to new repository
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Attach MongoDB plugin (or configure Atlas connection)
- [ ] Attach Redis plugin (or configure Upstash connection)
- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Test API endpoints at production URL

### Post-Deployment Verification
- [ ] Frontend loads correctly
- [ ] Backend health check passes: `GET /health`
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] Can create account and login
- [ ] Can create workspace
- [ ] Can create contact
- [ ] AI agent responds to queries
- [ ] Background jobs running (if enabled)

---

## Phase 15: Final Verification

### Code Quality
- [ ] Run ESLint on all code
- [ ] Fix any linting errors
- [ ] Run TypeScript type checking
- [ ] Fix any type errors
- [ ] Code review by team (if applicable)

### Security Audit
- [ ] Verify no secrets committed to git
- [ ] Check `.gitignore` is comprehensive
- [ ] Verify all API keys are in environment variables
- [ ] Test rate limiting is active in production
- [ ] Verify CORS origins are correctly configured
- [ ] Check that credentials are encrypted at rest

### Performance Testing
- [ ] Test frontend page load times
- [ ] Test API response times
- [ ] Test database query performance
- [ ] Test background job processing speed
- [ ] Load test critical endpoints (optional)

### Documentation Review
- [ ] All documentation files updated for new structure
- [ ] README.md accurately describes new repository
- [ ] CONTRIBUTING.md reflects new development workflow
- [ ] API documentation matches actual endpoints
- [ ] Environment variable documentation complete

---

## Phase 16: Migration Complete

- [ ] Tag current development repo as `legacy`
- [ ] Update all team member git remotes
- [ ] Communicate new repository structure to team
- [ ] Archive old development repository (if applicable)
- [ ] Update project management tools with new repo links
- [ ] Update external documentation/wikis
- [ ] Celebrate successful migration! 🎉

---

## Rollback Plan

If issues arise during migration:

1. **Keep old repository**: Don't delete until new repo is fully validated
2. **Test in staging**: Deploy to staging environment before production
3. **Database backup**: Take MongoDB backup before switching
4. **DNS/Domain**: Keep old deployment running until DNS propagation complete
5. **Gradual cutover**: Consider gradual traffic shifting if possible

---

## Notes

- This checklist is comprehensive - not all items may apply to your specific migration
- Some phases can be done in parallel (e.g., frontend and backend migration)
- Optional separations (agents, jobs) can be done later if not needed initially
- Document all decisions in MIGRATION_NOTES.md
- Take your time - rushed migrations lead to issues

**Estimated Time**: 2-5 days (depending on team size and restructuring scope)

**Recommended Approach**: Start with simplest viable structure, add complexity as needed
