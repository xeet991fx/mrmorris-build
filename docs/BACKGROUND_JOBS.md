# Clianta - Background Jobs & Queue System

## Overview

Clianta uses **BullMQ** (Bull v5) with **Redis** for reliable background job processing and scheduled tasks. The system handles email synchronization, AI-powered insights, CRM automation, and integration syncing.

**Locations**:
- **Jobs**: `backend/src/jobs/`
- **Queue Config**: `backend/src/events/queue/queue.config.ts`
- **Queue Manager**: `backend/src/events/queue/QueueManager.ts`
- **Monitoring Dashboard**: `http://localhost:5000/admin/queues` (Bull Board)

---

## 1. Background Job System Architecture

```
Scheduled Jobs (node-cron)
        ↓
   Job Scheduler
        ↓
   BullMQ Queue
        ↓
   Queue Workers (BullMQ)
        ↓
   Job Processing
        ↓
   Result/Error Logging
```

### Queue Infrastructure

**Queue Names**:
```typescript
CRM_EVENTS: 'crm-events'              // Primary event queue
CRM_EVENTS_DLQ: 'crm-events-dlq'      // Dead letter queue for failed events
WORKFLOW_BRIDGE: 'crm-workflow-bridge' // Workflow trigger queue
ACTIVITY_LOG: 'crm-activity-log'       // Activity logging queue
```

**Queue Configuration**:
- **Connection**: Redis (supports Upstash TLS via `rediss://`)
- **Retry Strategy**: Exponential backoff (1s, 5s, 30s)
- **Concurrency**: 3 jobs per worker (configurable via `QUEUE_CONCURRENCY`)
- **Rate Limiting**: 5 jobs/second max (configurable via `QUEUE_MAX_JOBS_PER_SECOND`)
- **Retention**: Completed jobs kept for 24 hours, failed jobs for 7 days

---

## 2. Scheduled Jobs (11 Active + 3 Legacy)

### Email Sync Job

**File**: `jobs/emailSyncJob.ts`
**Schedule**: Every 5 minutes
**Purpose**: Synchronize emails from connected email accounts (Gmail, Outlook, SMTP/IMAP)

**What It Does**:
1. Fetches all active EmailAccount records
2. For each account, pulls new emails since last sync
3. Creates EmailMessage records in database
4. Updates contact activity timeline
5. Triggers workflows based on email events (reply, forward)

**Configuration**:
```typescript
// Runs every 5 minutes
schedule: '*/5 * * * *'
```

**Dependencies**:
- EmailAccount model (IMAP/SMTP credentials)
- EmailService (email fetching logic)
- Workflow triggers (email.received, email.replied)

---

### Contact Sync Job

**File**: Indirectly called via `services/contactSyncService.ts`
**Schedule**: Daily at 2:00 AM
**Purpose**: Update contact data from integrations (Apollo.io, etc.)

**What It Does**:
1. Finds contacts due for enrichment update (>30 days since last update)
2. Calls Apollo.io API for firmographic/demographic data
3. Updates contact fields (company, title, phone, etc.)
4. Recalculates lead scores based on new data

**Configuration**:
```typescript
// Runs daily at 2 AM
schedule: '0 2 * * *'
```

**Dependencies**:
- ApolloService (Apollo.io API integration)
- LeadScoring service (score recalculation)

---

### Intent Score Decay Job

**File**: `jobs/intentScoreDecayJob.ts`
**Schedule**: Daily at 2:00 AM
**Purpose**: Decay intent scores over time for inactive contacts

**What It Does**:
1. Finds all IntentSignal records older than 1 day
2. Reduces intent score by configured decay rate (default: 2 points/day)
3. Removes intent signals with score < 10
4. Updates contact's overall intent score
5. Triggers workflows if score crosses thresholds (high → medium → low)

**Configuration**:
```typescript
// Runs daily at 2 AM
schedule: '0 2 * * *'
decayRate: 2 // points per day
```

**Intent Scoring Logic**:
- Page view: +5 points
- Email open: +3 points
- Link click: +10 points
- Form submission: +20 points
- Demo request: +50 points
- Decay: -2 points/day (prevents stale high scores)

**Purpose**: Ensure intent scores reflect recent activity, not historical engagement.

---

### Lifecycle Progression Job

**File**: `jobs/lifecycleProgressionJob.ts`
**Schedule**: Every 2 hours
**Purpose**: Automatically progress contacts through lifecycle stages

**What It Does**:
1. **Lead → MQL (Marketing Qualified Lead)**:
   - Criteria: Lead score ≥ B, Intent score > 50, Form submission
2. **MQL → SQL (Sales Qualified Lead)**:
   - Criteria: Sales activity (call, meeting), Lead score ≥ A
3. **SQL → Opportunity**:
   - Criteria: Deal created with contact
4. **Opportunity → Customer**:
   - Criteria: Deal status = 'won', close date filled

**Configuration**:
```typescript
// Runs every 2 hours
schedule: '0 */2 * * *'
```

**Logging**:
- Creates ContactLifecycleHistory record for each progression
- Triggers workflows on stage change (e.g., MQL → assign to SDR)

**Notes**:
- Rules configurable per workspace in BusinessProfile
- Prevents manual stage changes from being overwritten (checks `manualOverride` flag)

---

### Lead Recycling Job

**File**: `jobs/leadRecyclingJob.ts`
**Schedule**: Daily at 9:00 AM
**Purpose**: Re-engage cold/stale leads

**What It Does**:
1. Finds contacts marked as "lost" or "unqualified" > 90 days ago
2. Checks for recent positive signals (website visit, email open)
3. If signals present:
   - Updates status to "recycled"
   - Enrolls in re-engagement sequence
   - Creates task for assigned rep: "Follow up with recycled lead"
4. Logs activity in LeadRecycling model

**Configuration**:
```typescript
// Runs daily at 9 AM
schedule: '0 9 * * *'
recycleAfterDays: 90
```

**Re-engagement Criteria**:
- Lost/unqualified > 90 days
- Recent activity (website visit, email open in last 30 days)
- Not already in active sequence

**Purpose**: Recover lost leads who show renewed interest.

---

### Meeting Prep Job

**File**: `jobs/meetingPrepJob.ts`
**Schedule**: 30 minutes before each meeting
**Purpose**: Generate AI-powered meeting briefings

**What It Does**:
1. Queries CalendarEvent model for meetings in next 30-60 minutes
2. For each upcoming meeting:
   - Identifies attendees (Contact records)
   - Invokes multi-agent system (see AGENT_SYSTEM.md):
     - contactAgent: Contact history
     - companyAgent: Company insights
     - dealAgent: Open opportunities
     - briefingAgent: Synthesize into brief
3. Creates Meeting record with AI-generated brief
4. Sends in-app notification to meeting owner

**Configuration**:
```typescript
// Runs every 30 minutes
schedule: '*/30 * * * *'
```

**Output Example**:
```
Meeting in 30 minutes: John Doe @ Acme Corp

Key Points:
- Last contacted 2 weeks ago
- Open deal: $50K ARR (Proposal stage)
- Competitor: Currently using HubSpot

Recommended Talking Points:
1. ROI from AI automation
2. Integration capabilities
3. Implementation timeline

Questions to Ask:
- What are top 3 pain points?
- Decision timeline?
- Other stakeholders involved?
```

---

### Stale Deal Alert Job

**File**: `jobs/staleDealAlertJob.ts`
**Schedule**: Daily at 9:00 AM
**Purpose**: Alert reps about inactive deals

**What It Does**:
1. Finds open opportunities with no activity (email, call, meeting, note) in last 7 days
2. For each stale deal:
   - Creates AINotification: "Deal inactive for 7 days"
   - Creates Task: "Follow up on stale deal"
   - Sends in-app notification to deal owner
3. If deal > 30 days stale:
   - Adds "at-risk" tag
   - Escalates to manager (TeamMember with role: 'admin')

**Configuration**:
```typescript
// Runs daily at 9 AM
schedule: '0 9 * * *'
staleThreshold: 7 // days
criticalThreshold: 30 // days
```

**Purpose**: Prevent deals from going dark, increase win rates.

---

### Daily Insight Job

**File**: `jobs/dailyInsightJob.ts`
**Schedule**: Daily at 8:00 AM
**Purpose**: Generate daily workspace insights via AI

**What It Does**:
1. Aggregates workspace metrics:
   - New contacts (last 24 hours)
   - New deals (last 24 hours)
   - Deal stage changes
   - Email campaign performance
   - Top performers (reps with most activities)
2. Invokes AI agent to generate insights:
   - Trends (increasing/decreasing metrics)
   - Anomalies (sudden spikes/drops)
   - Recommendations (actions to take)
3. Creates AgentInsight record
4. Sends notification to workspace admins

**Configuration**:
```typescript
// Runs daily at 8 AM
schedule: '0 8 * * *'
```

**Output Example**:
```
Daily Insights - Jan 10, 2026

📈 Trending Up:
- New contacts: +42% (35 today vs 25 average)
- Email open rate: +15% (campaign: "Product Launch")

📉 Needs Attention:
- Deals in Proposal stage: No movement in 5 days
- SDR response time: Increased to 4 hours (SLA: 2 hours)

💡 Recommendations:
1. Follow up on stalled Proposal stage deals
2. Reallocate leads to available SDRs
3. Replicate "Product Launch" email strategy
```

---

### Proactive AI Job

**File**: `jobs/proactiveAI.ts`
**Schedule**: Various (orchestrates multiple AI jobs)
**Purpose**: Umbrella for all proactive AI operations

**What It Does**:
- Initializes **Meeting Prep Job**
- Initializes **Stale Deal Alert Job**
- Initializes **Daily Insight Job**
- Coordinates AI agent background tasks

**Configuration**: Delegates to individual jobs.

---

### Sequence Email Job

**File**: `jobs/sequenceEmailJob.ts`
**Schedule**: Every 5 minutes
**Purpose**: Send scheduled emails in multi-step sequences

**What It Does**:
1. Queries Sequence model for active sequences
2. Finds contacts enrolled in sequences (via WorkflowEnrollment)
3. Checks if next email in sequence is due based on delay settings
4. Sends email via EmailService
5. Records email sending in Activity model
6. Updates enrollment status (completed, bounced, unsubscribed)

**Configuration**:
```typescript
// Runs every 5 minutes
schedule: '*/5 * * * *'
```

---

### Google Sheet Form Sync Job

**File**: `jobs/googleSheetFormSyncJob.ts`
**Schedule**: Every 10 minutes
**Purpose**: Sync form submissions from Google Sheets to Clianta

**What It Does**:
1. Queries Form model for forms with Google Sheets integration
2. Fetches new rows from connected Google Sheets
3. Creates Contact records from sheet data
4. Creates FormSubmission records
5. Triggers workflows based on form submission events

**Configuration**:
```typescript
// Runs every 10 minutes
schedule: '*/10 * * * *'
```

---

### Token Expiration Check Job

**File**: `jobs/tokenExpirationCheckJob.ts`
**Schedule**: Daily at 3:00 AM
**Purpose**: Check and refresh OAuth tokens before expiration

**What It Does**:
1. Queries IntegrationCredential model for OAuth tokens expiring in next 7 days
2. For each expiring token:
   - Attempts token refresh using refresh token
   - Updates credentials in database
   - Logs refresh success/failure
3. Creates AINotification for failed refreshes
4. Alerts workspace admin to reconnect integration if refresh fails

**Configuration**:
```typescript
// Runs daily at 3 AM
schedule: '0 3 * * *'
expirationWarningDays: 7
```

---

## LEGACY/ARCHIVED Jobs (Agent Builder)

The following jobs were part of the Agent Builder feature that was archived on February 4, 2026. These files remain in `backend/src/jobs/` for reference but are **NOT active** and should **NOT be used** in new development. See `docs/legacy/` for Agent Builder recovery documentation.

### ❌ LEGACY: Agent Event Trigger Job

**File**: `jobs/agentEventTriggerJob.ts`
**Status**: ARCHIVED - Not in active use
**Former Purpose**: Triggered agent builder executions based on events

**Note**: This job was part of the deprecated Agent Builder feature. Use the multi-agent chatbot system (`backend/src/chatbot/`) instead.

---

### ❌ LEGACY: Agent Resume Execution Job

**File**: `jobs/agentResumeExecutionJob.ts`
**Status**: ARCHIVED - Not in active use
**Former Purpose**: Resumed paused agent builder executions

**Note**: This job was part of the deprecated Agent Builder feature. Use the multi-agent chatbot system (`backend/src/chatbot/`) instead.

---

### ❌ LEGACY: Agent Scheduled Job

**File**: `jobs/agentScheduledJob.ts`
**Status**: ARCHIVED - Not in active use
**Former Purpose**: Executed agent builder tasks on schedule

**Note**: This job was part of the deprecated Agent Builder feature. Use the multi-agent chatbot system (`backend/src/chatbot/`) instead.

---

## 3. Queue Configuration (Upstash-Optimized)

### Redis Connection

**Supported Formats**:
```typescript
// Option 1: REDIS_URL (Upstash, Railway, Heroku)
REDIS_URL=rediss://user:pass@host:port/db

// Option 2: Individual params (local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret
```

**TLS Support**:
- Automatically detects `rediss://` protocol
- Enables TLS for Upstash/secure connections

### Queue Options

```typescript
// backend/src/events/queue/queue.config.ts
defaultQueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,                      // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 1000                     // 1s → 5s → 30s backoff
    },
    removeOnComplete: {
      age: 86400,                     // Keep completed for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800,                    // Keep failed for 7 days
      count: 5000
    }
  }
};
```

### Worker Options (Upstash-Optimized)

```typescript
defaultWorkerOptions = {
  connection: redisConnection,
  concurrency: 3,                     // Process 3 jobs concurrently
  limiter: {
    max: 5,                           // Max 5 jobs/second
    duration: 1000
  },
  drainDelay: 30000,                  // Poll every 30s when empty (Upstash optimization)
  stalledInterval: 60000,             // Check stalled jobs every 60s
  lockDuration: 60000                 // 60s job lock
};
```

**Upstash Optimizations**:
- `drainDelay: 30000`: Reduces Redis requests when queue empty (default: 5s)
- `stalledInterval: 60000`: Less frequent stalled job checks (default: 30s)
- **Why**: Upstash free tier has 10,000 commands/day limit

---

## 4. Event-Driven Architecture

### Event Publishers

**Location**: `backend/src/events/publisher/`

Publishes CRM events to queue:
```typescript
// Example: Contact created event
EventPublisher.publish('contact.created', {
  contactId: newContact._id,
  workspaceId: workspace._id,
  userId: user._id
});
```

### Event Consumers

**Location**: `backend/src/events/consumers/`

Processes events from queue:
```typescript
// Contact created consumer
consumeContactCreated(job) {
  const { contactId, workspaceId } = job.data;

  // Actions:
  // 1. Calculate lead score
  // 2. Check workflow triggers
  // 3. Send welcome email (if configured)
  // 4. Assign to owner (round-robin)
}
```

### Event Schemas

**Location**: `backend/src/events/schemas/`

TypeScript schemas for event payloads:
```typescript
interface ContactCreatedEvent {
  contactId: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  source: 'manual' | 'import' | 'form' | 'api';
  timestamp: Date;
}
```

---

## 5. Bull Board Dashboard

### Access

**URL**: `http://localhost:5000/admin/queues`

**Features**:
- View all queues and job counts
- Monitor job status (waiting, active, completed, failed)
- Retry failed jobs manually
- View job details and error logs
- Pause/resume queues
- Clean up old jobs

### Queue Statistics

- **Waiting**: Jobs in queue, not yet processed
- **Active**: Jobs currently being processed
- **Completed**: Successfully finished jobs
- **Failed**: Jobs that failed after all retries
- **Delayed**: Jobs scheduled for future execution

---

## 6. Job Monitoring & Debugging

### Logging

All jobs log to console with emojis for visibility:
```typescript
console.log('📧 Email sync started for 15 accounts');
console.log('✅ Synced 42 new emails');
console.error('❌ Email sync failed for account X:', error);
```

### Error Tracking

Integrated with Sentry (if `SENTRY_DSN` configured):
```typescript
import * as Sentry from '@sentry/node';

try {
  await processJob(job);
} catch (error) {
  Sentry.captureException(error, {
    tags: { job: job.name },
    extra: job.data
  });
  throw error; // Re-throw for BullMQ retry
}
```

### Dead Letter Queue

Failed jobs (after 3 retries) moved to `CRM_EVENTS_DLQ`:
```typescript
// Manually inspect DLQ via Bull Board
// Retry individual jobs or bulk retry
```

---

## 7. Scaling Background Jobs

### Current Setup (Development)

⚠️ **Note**: Background jobs currently **disabled in development** due to Redis rate limits on Upstash free tier.

```typescript
// backend/src/server.ts (lines 452-492)
// ⚠️ BACKGROUND JOBS TEMPORARILY DISABLED
console.log('⚠️  Background jobs disabled to prevent Redis rate limit');
```

### Production Scaling Recommendations

#### **Option 1: Dedicated Worker Instance**
Separate backend server instance running only background jobs:
```bash
# API Server
node dist/server.js

# Worker Server (separate instance)
WORKER_MODE=true node dist/worker.js
```

**Benefits**:
- Isolate job processing from API requests
- Scale workers independently
- Prevent job backlog from affecting API performance

#### **Option 2: Horizontal Worker Scaling**
Multiple worker instances processing same queue:
```yaml
# Railway/Docker Compose
workers:
  replicas: 3
  environment:
    QUEUE_CONCURRENCY: 5
```

**BullMQ handles**:
- Job distribution across workers
- Locking to prevent duplicate processing
- Graceful shutdown

#### **Option 3: Separate Queues per Job Type**
```typescript
QUEUE_NAMES = {
  EMAIL_SYNC: 'email-sync',
  AI_JOBS: 'ai-jobs',
  ANALYTICS: 'analytics'
};
```

**Benefits**:
- Prioritize critical jobs (email sync > analytics)
- Different concurrency per queue type
- Easier monitoring and debugging

---

## 8. Redis Optimization Strategies

### For Upstash Free Tier

**Command Limits**: 10,000 commands/day

**Optimizations Applied**:
1. **Increased drainDelay**: 30s (default: 5s) → 83% fewer polls
2. **Reduced stalledInterval**: 60s (default: 30s) → 50% fewer checks
3. **Limited concurrency**: 3 jobs (vs 10+) → fewer active connections
4. **Job retention**: 24h completed, 7d failed (vs unlimited)

**Result**: ~500 commands/day per worker (within limit)

### For Production Redis

**Upgrade to**:
- Upstash Standard ($10/mo): 1M commands/month
- Railway Redis Plugin: Unlimited, low latency
- AWS ElastiCache: Enterprise-grade scaling

**Remove Optimizations**:
```typescript
drainDelay: 5000,        // Default polling
stalledInterval: 30000,  // Default stalled checks
concurrency: 10          // Higher concurrency
```

---

## 9. Future Enhancements

### Planned Features

1. **Job Prioritization**: High/medium/low priority queues
2. **Job Scheduling**: Delay execution to specific time (e.g., send email at 9 AM)
3. **Job Chaining**: Dependent jobs (job B runs after job A completes)
4. **Progress Tracking**: Real-time progress updates for long-running jobs
5. **Webhook Notifications**: Notify external systems on job completion
6. **Job Metrics**: Prometheus/Grafana dashboard for job analytics

---

## Summary

Clianta's background job system provides:
- **8 Active Scheduled Jobs** for CRM automation and AI insights (plus 1 legacy)
- **BullMQ Queue System** with Redis for reliability
- **Event-Driven Architecture** for async CRM operations
- **Bull Board Dashboard** for monitoring and debugging
- **Upstash-Optimized** configuration for cost-effective development
- **Scalable Architecture** ready for production workloads

**Current Status**: Background jobs disabled in development due to Redis limits. Enable in production with appropriate Redis instance.

For related documentation, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Event-driven architecture overview
- [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) - AI agent background operations
- [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) - Redis configuration
