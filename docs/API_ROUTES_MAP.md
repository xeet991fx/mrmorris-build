# Clianta - API Routes Reference

## Overview

Complete reference of all API endpoints in Clianta backend (60+ route files, 200+ endpoints).

**Base URL**: `http://localhost:5000/api` (development) or `https://api.clianta.online/api` (production)
**Authentication**: JWT Bearer token (except public routes)
**Workspace Scoping**: Most routes use `/api/workspaces/:workspaceId/[resource]`

---

## Authentication Routes (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create new user account |
| POST | `/login` | Email/password login |
| POST | `/logout` | Logout current session |
| GET | `/me` | Get current user info |
| POST | `/google` | Google OAuth login |
| GET | `/google/callback` | Google OAuth callback |
| POST | `/verify-email` | Verify email with token |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |

---

## Core CRM Routes

### Contacts (`/api/workspaces/:id/contacts`)
- GET `/` - List contacts (pagination, filters)
- POST `/` - Create contact
- GET `/:contactId` - Get single contact
- PUT `/:contactId` - Update contact
- DELETE `/:contactId` - Delete contact
- POST `/import` - Bulk import from CSV/Excel
- POST `/:contactId/enrich` - Enrich with Apollo.io

### Companies (`/api/workspaces/:id/companies`)
- GET `/` - List companies
- POST `/` - Create company
- GET `/:companyId` - Get single company
- PUT `/:companyId` - Update company
- DELETE `/:companyId` - Delete company
- GET `/:companyId/contacts` - Get company contacts

### Opportunities (`/api/workspaces/:id/opportunities`)
- GET `/` - List opportunities
- POST `/` - Create opportunity
- GET `/:oppId` - Get single opportunity
- PUT `/:oppId` - Update opportunity
- DELETE `/:oppId` - Delete opportunity
- PUT `/:oppId/stage` - Move to different stage

### Pipelines (`/api/workspaces/:id/pipelines`)
- GET `/` - List pipelines
- POST `/` - Create pipeline
- PUT `/:pipelineId` - Update pipeline
- DELETE `/:pipelineId` - Delete pipeline

### Activities (`/api/activities`)
- GET `/workspaces/:id/activities` - List activities
- POST `/workspaces/:id/activities` - Create activity
- GET `/:activityId` - Get single activity
- PUT `/:activityId` - Update activity

### Tasks (`/api/workspaces/:id/tasks`)
- GET `/` - List tasks
- POST `/` - Create task
- PUT `/:taskId` - Update task
- DELETE `/:taskId` - Delete task

---

## Sales Engagement & Campaign Routes

### Campaigns (`/api/campaigns`)
- GET `/workspaces/:id` - List campaigns
- POST `/workspaces/:id` - Create campaign
- GET `/:campaignId` - Get campaign details
- PUT `/:campaignId` - Update campaign
- POST `/:campaignId/send` - Send campaign
- GET `/:campaignId/analytics` - Campaign analytics

### Email Templates (`/api/workspaces/:id/email-templates`)
- GET `/` - List templates
- POST `/` - Create template
- GET `/:templateId` - Get template
- PUT `/:templateId` - Update template
- DELETE `/:templateId` - Delete template

### Sequences (`/api/workspaces/:id/sequences`)
- GET `/` - List sequences
- POST `/` - Create sequence
- PUT `/:sequenceId` - Update sequence
- POST `/:sequenceId/enroll` - Enroll contacts
- POST `/:sequenceId/pause` - Pause sequence

### Forms (`/api/workspaces/:id/forms`)
- GET `/` - List forms
- POST `/` - Create form
- PUT `/:formId` - Update form
- DELETE `/:formId` - Delete form

### Public Forms (`/api/public`)
- POST `/forms/:formId/submit` - Submit form (no auth)
- GET `/forms/:formId` - Get form details (no auth)

### Landing Pages (`/api/landing-pages`)
- GET `/workspaces/:id` - List landing pages
- POST `/workspaces/:id` - Create landing page
- GET `/:slug` - Get public landing page (no auth)
- PUT `/:pageId` - Update landing page

---

## Automation & Workflow Routes

### Workflows (`/api/workspaces/:id/workflows`)
- GET `/` - List workflows
- POST `/` - Create workflow
- GET `/:workflowId` - Get workflow
- PUT `/:workflowId` - Update workflow
- POST `/:workflowId/activate` - Activate workflow
- POST `/:workflowId/pause` - Pause workflow
- GET `/:workflowId/enrollments` - Get enrollments

### Workflow Data Sources (`/api/workspaces/:id/workflows/:workflowId/data-sources`)
- GET `/` - List available data sources
- GET `/:source/fields` - Get fields for data source

---

## AI & Agent Routes

### AI Agents (`/api/workspaces/:id/agents`)
- POST `/chat` - Chat with AI agent
- GET `/sessions` - List agent sessions
- GET `/sessions/:sessionId` - Get session details

### AI Memory (`/api`)
- GET `/workspaces/:id/ai-memory` - Get AI memory for workspace
- POST `/workspaces/:id/ai-memory` - Add memory entry
- DELETE `/ai-memory/:memoryId` - Delete memory

### AI Content (`/api/ai-content`)
- POST `/generate-email` - Generate email with AI
- POST `/generate-form` - Generate form with AI
- POST `/generate-campaign` - Generate campaign content

### AI Notifications (`/api`)
- GET `/workspaces/:id/ai-notifications` - Get AI notifications
- PUT `/ai-notifications/:notificationId/read` - Mark as read

---

## Integration Routes

### Email Accounts (`/api/email-accounts`)
- GET `/` - List email accounts
- POST `/` - Add email account
- POST `/:accountId/sync` - Trigger email sync
- DELETE `/:accountId` - Remove email account

### Email Integration (`/api/email`)
- POST `/connect/gmail` - Connect Gmail OAuth
- POST `/connect/outlook` - Connect Outlook OAuth
- POST `/connect/smtp` - Connect SMTP/IMAP

### Calendar (`/api/calendar`)
- POST `/connect` - Connect Google Calendar
- GET `/events` - List synced events
- POST `/events` - Create calendar event

### Apollo.io (`/api/workspaces/:id/apollo`)
- POST `/enrich` - Enrich contact data
- GET `/usage` - Check API usage

### Google Sheets (`/api/integrations/google-sheets`)
- POST `/import` - Import from Google Sheets
- POST `/export` - Export to Google Sheets

### Notion (`/api/integrations/notion`)
- POST `/connect` - Connect Notion workspace
- POST `/sync` - Sync Notion pages
- POST `/export` - Export to Notion

### Slack (`/api/integrations/slack`)
- POST `/oauth` - Slack OAuth callback
- POST `/webhook` - Receive Slack events
- POST `/test` - Test Slack connection

### Legacy Integration Routes (Not in Active Use)

**Salesforce** (`/api/workspaces/:id/salesforce` or `/api/salesforce`):
- Routes exist in codebase but integration not actively used
- Files: `backend/src/routes/salesforceIntegration.ts`

---

## Analytics & Reporting Routes

### Dashboard (`/api/workspaces/:id/dashboard`)
- GET `/overview` - Get dashboard metrics
- GET `/activity-feed` - Recent activities

### Analytics (`/api/workspaces/:id/analytics`)
- GET `/overview` - Workspace analytics overview
- GET `/campaigns` - Campaign performance
- GET `/lead-scores` - Lead score distribution
- GET `/funnel` - Conversion funnel metrics

### Reports (`/api/workspaces/:id/reports`)
- GET `/` - List saved reports
- POST `/` - Create custom report
- GET `/:reportId` - Get report data
- PUT `/:reportId` - Update report

### Insights (`/api/workspaces/:id/insights`)
- GET `/` - Get AI-generated insights
- GET `/:insightId` - Get single insight

### Forecasting (`/api/workspaces/:id/forecasting`)
- GET `/` - Get revenue forecast
- POST `/recalculate` - Recalculate forecast

---

## Email & Tracking Routes

### Inbox (`/api/inbox`)
- GET `/workspaces/:id` - Get unified inbox
- GET `/conversations/:conversationId` - Get email thread
- POST `/reply` - Reply to email

### Email Tracking (`/api/email-tracking`)
- GET `/track/open/:trackingId` - Track email open (pixel)
- GET `/track/click/:trackingId/:linkId` - Track link click

### Tracking Events (`/api`)
- POST `/track/event` - Track custom event (public)
- GET `/workspaces/:id/tracking/events` - Get tracked events

### Company Visitors (`/api/workspaces/:id/company-visitors`)
- GET `/` - List company visitors
- GET `/:visitorId` - Get visitor details

---

## Lead Scoring & Lifecycle Routes

### Lead Scores (`/api/workspaces/:id/lead-scores`)
- GET `/` - List lead scores
- POST `/recalculate` - Recalculate all scores
- GET `/:contactId/score` - Get contact score details

### Intent Scoring (`/api/workspaces/:id/intent-scoring`)
- GET `/` - Get intent scores
- POST `/:contactId/signal` - Add intent signal

### Lifecycle Stages (`/api/lifecycle-stages`)
- GET `/` - List lifecycle stages
- PUT `/:contactId/stage` - Update contact stage
- GET `/history/:contactId` - Get stage history

### Lead Recycling (`/api/lead-recycling`)
- GET `/workspaces/:id` - Get recycled leads
- POST `/recycle/:contactId` - Manually recycle lead

---

## Advanced Features Routes

### Proposals (`/api/workspaces/:id/proposals`)
- GET `/` - List proposals
- POST `/` - Create proposal
- GET `/:proposalId` - Get proposal details

### Meetings (`/api/workspaces/:id/meetings` or `/api/workspaces/:id/meeting-scheduler`)
- GET `/` - List meetings
- POST `/` - Schedule meeting
- GET `/:meetingId/brief` - Get AI meeting brief

### Chatbots (`/api/workspaces/:id/chatbots`)
- GET `/` - List chatbots
- POST `/` - Create chatbot
- PUT `/:chatbotId` - Update chatbot

### Attribution (`/api/attribution`)
- GET `/workspaces/:id` - Get attribution data
- GET `/workspaces/:id/revenue` - Revenue attribution

### Referrals (`/api/referrals`)
- GET `/workspaces/:id` - List referrals
- POST `/` - Create referral

---

## Admin Routes

### Bull Board (`/admin/queues`)
- GET `/` - Queue monitoring dashboard (HTML)

### Webhooks (`/api/workspaces/:id/webhooks`)
- GET `/` - List webhooks
- POST `/` - Create webhook
- DELETE `/:webhookId` - Delete webhook

---

## Public Routes (No Authentication)

- POST `/api/public/forms/:formId/submit` - Form submission
- GET `/api/landing-pages/:slug` - Landing page view
- GET `/api/track.js` - Tracking script
- GET `/api/s.js` - Ad-blocker friendly tracking script
- GET `/api/forms/embed.js` - Form embed script
- POST `/api/track/event` - Track custom event
- GET `/api/email-tracking/track/open/:trackingId` - Email open tracking
- GET `/api/email-tracking/track/click/:trackingId/:linkId` - Link click tracking

---

## Summary

- **Total Routes**: 60+ route files
- **Total Endpoints**: 200+ endpoints
- **Authentication**: JWT Bearer (except public routes)
- **Workspace Scoping**: Most routes use `/api/workspaces/:id/[resource]`
- **Public Routes**: Forms, landing pages, tracking scripts

**Common Patterns**:
- List: `GET /api/workspaces/:id/[resource]`
- Create: `POST /api/workspaces/:id/[resource]`
- Read: `GET /api/workspaces/:id/[resource]/:resourceId`
- Update: `PUT /api/workspaces/:id/[resource]/:resourceId`
- Delete: `DELETE /api/workspaces/:id/[resource]/:resourceId`

For API implementation details, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Route architecture
- [MODELS_AND_SCHEMAS.md](./MODELS_AND_SCHEMAS.md) - Data models
- Source code: `backend/src/routes/`
