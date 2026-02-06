# Legacy Agent Builder - Archived

**Archive Date:** 2026-02-04
**Reason:** Making room for new agent builder version
**Method:** In-place archival (Dark Launch) - code preserved, integration points disabled

---

## What Was Archived

The legacy agent builder feature has been disabled to prevent interference with a new version. All code and data remain intact for potential recovery.

### Backend Components Disabled

**Routes Disabled in `backend/src/server.ts`:**
- Line 16: Socket.IO import (`initializeAgentExecutionSocket`)
- Lines 52-53: Route imports (`agentBuilderRoutes`, `agentCopilotRoutes`)
- Lines 418-419: Route registrations
- Line 493: Socket.IO initialization
- Lines 560-582: Background jobs (agent scheduled, event trigger, resume execution)

**Route Files (Marked with Deprecation Notice):**
- `backend/src/routes/agentBuilder.ts` - Agent Builder CRUD and execution routes
- `backend/src/routes/agentCopilot.ts` - AI Copilot chat and workflow generation routes

**Background Jobs Disabled:**
- Agent Scheduled Job (`startAgentScheduledJob`, `registerAllLiveAgentSchedules`)
- Agent Event Trigger Job (`startAgentEventTriggerJob`)
- Agent Resume Execution Job (`startAgentResumeExecutionJob`)

### Frontend Components Disabled

**Navigation Links Removed:**
- `frontend/app/projects/layout.tsx` (Line 85) - "Agents" sidebar navigation link (main navigation)
- `frontend/app/projects/[id]/dashboard/page.tsx` (Line 56) - "Agents" quick action link
- `frontend/components/landing/navbar.tsx` (Line 15) - "Agent Builder" landing page link

**Pages Marked with Deprecation Notice:**
- `frontend/app/projects/[id]/agents/page.tsx` - Agent list page
- `frontend/app/projects/[id]/agents/[agentId]/page.tsx` - Agent builder/editor page

### Database Models Preserved (NO CHANGES)

All database models and collections remain intact with user data preserved:

1. **Agent** (`backend/src/models/Agent.ts`) - Agent configurations
2. **AgentExecution** (`backend/src/models/AgentExecution.ts`) - Execution history
3. **AgentTestRun** (`backend/src/models/AgentTestRun.ts`) - Test run data
4. **AgentMemory** (`backend/src/models/AgentMemory.ts`) - Agent memory/learning
5. **AgentSession** (`backend/src/models/AgentSession.ts`) - Session management
6. **AgentPerformance** (`backend/src/models/AgentPerformance.ts`) - Performance metrics
7. **AgentInsight** (`backend/src/models/AgentInsight.ts`) - AI insights
8. **AgentCopilotConversation** (`backend/src/models/AgentCopilotConversation.ts`) - Copilot chat history

### Frontend Components Preserved (NO CHANGES)

All components remain in place for easy recovery:

- 40+ agent components in `frontend/components/agents/`
- Landing page section: `frontend/components/landing/agent-builder.tsx`
- API client: `frontend/lib/api/agents.ts`
- Type definitions: `frontend/types/agent.ts`

---

## Why These Components Were Archived

The agent builder feature is a comprehensive system spanning:
- **Backend**: 8 routes files, 8 database models, 3 background jobs, Socket.IO integration
- **Frontend**: 40+ components, 2 pages, API client, landing page section
- **Data**: User data in 8 MongoDB collections

To develop a new version without conflicts, the integration points have been disabled while preserving all code and data for potential recovery.

---

## Recovery Instructions

See `AGENT_BUILDER_RECOVERY.md` for detailed step-by-step recovery process.

**Quick Recovery Summary:**
1. Uncomment lines in `backend/src/server.ts` (16, 52-53, 418-419, 493, 560-582)
2. Uncomment navigation links in frontend files
3. Remove deprecation notices from route and page files
4. Restart backend and frontend services
5. Verify routes respond and jobs start

**Estimated Recovery Time:** 30 minutes

---

## Git References

- **Pre-archive snapshot:** `legacy-agent-builder-pre-archive` tag
- **Archive commit:** See git log for "Archive legacy agent builder" commit
- **Archive branch:** `archive/agent-builder-legacy` (if created)

---

## Files Modified

### Backend
- `backend/src/server.ts` - Commented route registrations and job initializations
- `backend/src/routes/agentBuilder.ts` - Added deprecation notice
- `backend/src/routes/agentCopilot.ts` - Added deprecation notice

### Frontend
- `frontend/app/projects/layout.tsx` - Commented "Agents" sidebar navigation link
- `frontend/app/projects/[id]/dashboard/page.tsx` - Commented "Agents" quick action
- `frontend/components/landing/navbar.tsx` - Commented "Agent Builder" nav link
- `frontend/app/projects/[id]/agents/page.tsx` - Added deprecation notice
- `frontend/app/projects/[id]/agents/[agentId]/page.tsx` - Added deprecation notice

### Documentation
- `LEGACY_AGENT_BUILDER.md` - This file
- `AGENT_BUILDER_RECOVERY.md` - Recovery checklist

---

## Notes

- **No data loss**: All MongoDB collections and data preserved
- **No code deletion**: All files remain in place
- **Quick restoration**: Simple uncomment and restart
- **Zero risk**: Can be reversed in minutes if needed
