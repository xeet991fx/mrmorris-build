# Agent Builder Recovery Checklist

This document provides step-by-step instructions to restore the legacy agent builder feature if needed.

**Estimated Time:** 30 minutes
**Risk Level:** Low (reversible at any step)

---

## Prerequisites

- [ ] Verify git tag exists: `git tag | grep legacy-agent-builder-pre-archive`
- [ ] Confirm you want to restore (will re-enable all agent builder features)
- [ ] Ensure new agent builder (if any) is disabled to avoid conflicts

---

## Step 1: Backend - Uncomment server.ts Lines

**File:** `backend/src/server.ts`

### 1.1 Uncomment Socket.IO Import (Line 16)
```typescript
// BEFORE:
// LEGACY AGENT BUILDER - ARCHIVED [DATE]
// import { initializeAgentExecutionSocket } from "./socket/agentExecutionSocket";

// AFTER:
import { initializeAgentExecutionSocket } from "./socket/agentExecutionSocket";
```

### 1.2 Uncomment Route Imports (Lines 52-53)
```typescript
// BEFORE:
// LEGACY AGENT BUILDER - ARCHIVED [DATE]
// import agentBuilderRoutes from "./routes/agentBuilder";
// import agentCopilotRoutes from "./routes/agentCopilot";

// AFTER:
import agentBuilderRoutes from "./routes/agentBuilder";
import agentCopilotRoutes from "./routes/agentCopilot";
```

### 1.3 Uncomment Route Registrations (Lines 418-419)
```typescript
// BEFORE:
// LEGACY AGENT BUILDER - ARCHIVED [DATE]
// app.use("/api", agentBuilderRoutes);
// app.use("/api/workspaces", agentCopilotRoutes);

// AFTER:
app.use("/api", agentBuilderRoutes);
app.use("/api/workspaces", agentCopilotRoutes);
```

### 1.4 Uncomment Socket.IO Initialization (Line 493)
```typescript
// BEFORE:
// LEGACY AGENT BUILDER - ARCHIVED [DATE]
// initializeAgentExecutionSocket(io);
// logger.info('Agent Execution Socket.IO initialized');

// AFTER:
initializeAgentExecutionSocket(io);
logger.info('Agent Execution Socket.IO initialized');
```

### 1.5 Uncomment Background Jobs (Lines 560-582)
```typescript
// BEFORE:
// ============================================
// LEGACY AGENT BUILDER - ARCHIVED [DATE]
// Jobs disabled to prevent interference with new version
// To restore: Uncomment lines below and restart
// ============================================
/*
try {
  await startAgentScheduledJob();
  await registerAllLiveAgentSchedules();
  logger.info('✅ Agent scheduled job started');
} catch (error) {
  logger.error('Failed to start agent scheduled job', { error });
}

try {
  await startAgentEventTriggerJob();
  logger.info('✅ Agent event trigger job started');
} catch (error) {
  logger.error('Failed to start agent event trigger job', { error });
}

try {
  await startAgentResumeExecutionJob();
  logger.info('✅ Agent resume execution job started');
} catch (error) {
  logger.error('Failed to start agent resume execution job', { error });
}
*/

// AFTER:
try {
  await startAgentScheduledJob();
  await registerAllLiveAgentSchedules();
  logger.info('✅ Agent scheduled job started');
} catch (error) {
  logger.error('Failed to start agent scheduled job', { error });
}

try {
  await startAgentEventTriggerJob();
  logger.info('✅ Agent event trigger job started');
} catch (error) {
  logger.error('Failed to start agent event trigger job', { error });
}

try {
  await startAgentResumeExecutionJob();
  logger.info('✅ Agent resume execution job started');
} catch (error) {
  logger.error('Failed to start agent resume execution job', { error });
}
```

**Verification:**
- [ ] All uncommented lines have correct syntax
- [ ] No syntax errors in server.ts

---

## Step 2: Backend - Remove Deprecation Notices

### 2.1 agentBuilder.ts
**File:** `backend/src/routes/agentBuilder.ts`

Remove the deprecation notice at the top of the file (Lines 1-5):
```typescript
// REMOVE:
/**
 * ⚠️ LEGACY CODE - ARCHIVED [DATE]
 * This route is no longer active. See LEGACY_AGENT_BUILDER.md for details.
 * Route registration disabled in server.ts
 */
```

### 2.2 agentCopilot.ts
**File:** `backend/src/routes/agentCopilot.ts`

Remove the deprecation notice at the top of the file.

**Verification:**
- [ ] Deprecation notices removed from both route files

---

## Step 3: Frontend - Uncomment Navigation Links

### 3.1 Sidebar Navigation (Main Navigation)
**File:** `frontend/app/projects/layout.tsx`

Uncomment the Agents navigation item in the automation section (Line 85):
```typescript
// BEFORE:
automation: {
  label: "Automation",
  items: [
    // LEGACY AGENT BUILDER - ARCHIVED 2026-02-04 - Uncomment to restore
    // { label: "Agents", icon: CpuChipIcon, path: "agents" },
    { label: "Workflows", icon: BoltIcon, path: "workflows" },
    { label: "Tasks", icon: CheckCircleIcon, path: "tasks" },
    { label: "Tickets", icon: TicketIcon, path: "tickets" },
  ],
},

// AFTER:
automation: {
  label: "Automation",
  items: [
    { label: "Agents", icon: CpuChipIcon, path: "agents" },
    { label: "Workflows", icon: BoltIcon, path: "workflows" },
    { label: "Tasks", icon: CheckCircleIcon, path: "tasks" },
    { label: "Tickets", icon: TicketIcon, path: "tickets" },
  ],
},
```

### 3.2 Dashboard Navigation
**File:** `frontend/app/projects/[id]/dashboard/page.tsx`

Uncomment the Agents quick action (Line 56):
```typescript
// BEFORE:
const quickActions: QuickAction[] = [
  { label: "Contacts", icon: <UserGroupIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/contacts` },
  { label: "Deals", icon: <BriefcaseIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/deals` },
  // LEGACY AGENT BUILDER - ARCHIVED [DATE] - Uncomment to restore
  // { label: "Agents", icon: <CpuChipIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/agents` },
  { label: "Tasks", icon: <ClipboardDocumentListIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/tasks` },
];

// AFTER:
const quickActions: QuickAction[] = [
  { label: "Contacts", icon: <UserGroupIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/contacts` },
  { label: "Deals", icon: <BriefcaseIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/deals` },
  { label: "Agents", icon: <CpuChipIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/agents` },
  { label: "Tasks", icon: <ClipboardDocumentListIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/tasks` },
];
```

### 3.3 Landing Page Navigation
**File:** `frontend/components/landing/navbar.tsx`

Uncomment the Agent Builder nav link (Line 15):
```typescript
// BEFORE:
const navLinks = [
  { href: "#problem", label: "The Trap" },
  { href: "#capabilities", label: "Capabilities" },
  // LEGACY AGENT BUILDER - ARCHIVED [DATE]
  // { href: "#workflow", label: "Agent Builder" },
  { href: "#target", label: "Solutions" },
];

// AFTER:
const navLinks = [
  { href: "#problem", label: "The Trap" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "Agent Builder" },
  { href: "#target", label: "Solutions" },
];
```

**Verification:**
- [ ] Sidebar navigation includes Agents link (in Automation section)
- [ ] Dashboard quick actions include Agents link
- [ ] Landing page navigation includes Agent Builder link

---

## Step 4: Frontend - Remove Deprecation Notices

### 4.1 Agent List Page
**File:** `frontend/app/projects/[id]/agents/page.tsx`

Remove the deprecation notice at the top (if added).

### 4.2 Agent Builder Page
**File:** `frontend/app/projects/[id]/agents/[agentId]/page.tsx`

Remove the deprecation notice at the top (if added).

**Verification:**
- [ ] Deprecation notices removed from both page files

---

## Step 5: Restart Services

### 5.1 Backend
```bash
cd backend
npm run dev
# OR for production:
npm start
```

**Expected Log Output:**
```
Agent Execution Socket.IO initialized
✅ Agent scheduled job started
✅ Agent event trigger job started
✅ Agent resume execution job started
```

### 5.2 Frontend
```bash
cd frontend
npm run dev
# OR for production:
npm run build && npm start
```

**Verification:**
- [ ] Backend starts without errors
- [ ] All three agent job messages appear in logs
- [ ] Frontend builds/starts without errors
- [ ] No import warnings or errors

---

## Step 6: Verification Testing

### 6.1 Backend API Verification
```bash
# Test agent list endpoint
curl http://localhost:5000/api/workspaces/{WORKSPACE_ID}/agents \
  -H "Authorization: Bearer {YOUR_TOKEN}"

# Expected: 200 OK with agent list (or empty array)
```

### 6.2 Frontend UI Verification
1. Navigate to dashboard (`/projects/{id}/dashboard`)
2. Verify "Agents" quick action appears
3. Click "Agents" link
4. Verify agents page loads without errors
5. Navigate to landing page
6. Verify "Agent Builder" nav link appears

### 6.3 Socket.IO Verification
```bash
# Check Socket.IO namespaces (in backend logs)
# Should see: /agent-execution namespace registered
```

### 6.4 Background Jobs Verification
```bash
# Check backend logs for job initialization
# Should see all three "✅ Agent ... job started" messages
```

**Verification Checklist:**
- [ ] API routes respond with 200 (not 404)
- [ ] Dashboard shows Agents link
- [ ] Agents page loads successfully
- [ ] Landing page shows Agent Builder link
- [ ] Socket.IO namespace registered
- [ ] All three background jobs started
- [ ] No console errors in frontend
- [ ] No server errors in backend logs

---

## Step 7: Database Verification

### 7.1 Verify Collections Exist
```javascript
// In MongoDB shell or Compass
db.agents.countDocuments()
db.agentexecutions.countDocuments()
db.agenttestrun.countDocuments()
```

### 7.2 Verify Data Integrity
```javascript
// Sample agent query
db.agents.findOne({ workspace: ObjectId("YOUR_WORKSPACE_ID") })
```

**Verification:**
- [ ] All 8 agent collections exist
- [ ] Data counts match expected values
- [ ] Sample queries return valid data

---

## Step 8: Cleanup (Optional)

### 8.1 Remove Archive Documentation
```bash
git rm LEGACY_AGENT_BUILDER.md
git rm AGENT_BUILDER_RECOVERY.md
git commit -m "Remove archive documentation after recovery"
```

### 8.2 Create Recovery Tag
```bash
git tag -a legacy-agent-builder-restored -m "Agent Builder restored from archive"
git push origin legacy-agent-builder-restored
```

**Verification:**
- [ ] Archive docs removed (if desired)
- [ ] Recovery tag created (optional)

---

## Rollback (If Issues Occur)

If restoration causes problems, quickly rollback:

```bash
# Option 1: Revert to pre-archive state
git checkout legacy-agent-builder-pre-archive

# Option 2: Re-comment the lines
# Follow archival plan in reverse
```

---

## Troubleshooting

### Backend Won't Start
- Check for syntax errors in server.ts
- Verify all imports are uncommented
- Check logs for missing dependencies

### Routes Return 404
- Verify route registrations are uncommented (Lines 418-419)
- Restart backend server
- Check route paths match expected pattern

### Frontend Import Errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `npm install`
- Rebuild: `npm run build`

### Background Jobs Not Starting
- Check Redis connection (required for BullMQ)
- Verify job import statements are uncommented (Lines 88-90)
- Check logs for job-specific errors

---

## Success Criteria

Recovery is complete when:
- ✅ Backend starts without errors
- ✅ All three agent jobs initialize successfully
- ✅ API routes respond (not 404)
- ✅ Frontend builds without errors
- ✅ Navigation links appear in UI
- ✅ Agent pages load successfully
- ✅ Socket.IO namespace registered
- ✅ No console or server errors

---

## Contact

If you encounter issues during recovery, refer to:
- Git history: `git log --grep="Archive legacy agent builder"`
- Original implementation: Check commits before archive tag
- Database backup: Verify MongoDB backups exist before making changes
