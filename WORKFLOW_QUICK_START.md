# 🚀 Workflow System - Quick Start Guide

## Integration Steps (5 Minutes)

### Step 1: Import Components

Add these imports to your workflow builder page:

```typescript
// In your workflow builder page (e.g., app/projects/[id]/workflows/[workflowId]/page.tsx)
import TestWorkflowModal from '@/components/workflows/TestWorkflowModal';
import FailedEnrollmentsPanel from '@/components/workflows/FailedEnrollmentsPanel';
```

### Step 2: Add State

```typescript
const [testModalOpen, setTestModalOpen] = useState(false);
const [failedPanelOpen, setFailedPanelOpen] = useState(false);
const [failedCount, setFailedCount] = useState(0);
```

### Step 3: Add UI Elements

**In your workflow toolbar, add these buttons:**

```tsx
<div className="flex items-center gap-3">
  {/* Test Workflow Button */}
  <button
    onClick={() => setTestModalOpen(true)}
    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-2"
  >
    <BeakerIcon className="w-4 h-4" />
    Test Workflow
  </button>

  {/* Failed Enrollments Badge (only show if failures exist) */}
  {failedCount > 0 && (
    <button
      onClick={() => setFailedPanelOpen(true)}
      className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 transition-colors flex items-center gap-2 relative"
    >
      <ExclamationCircleIcon className="w-4 h-4" />
      Failed ({failedCount})
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    </button>
  )}
</div>
```

### Step 4: Add Modal Components

**At the end of your page component:**

```tsx
{/* Test Workflow Modal */}
<TestWorkflowModal
  isOpen={testModalOpen}
  onClose={() => setTestModalOpen(false)}
  workspaceId={workspaceId}
  workflowId={workflowId}
  workflowName={workflow?.name || "Workflow"}
/>

{/* Failed Enrollments Panel */}
<FailedEnrollmentsPanel
  isOpen={failedPanelOpen}
  onClose={() => setFailedPanelOpen(false)}
  workspaceId={workspaceId}
  workflowId={workflowId}
/>
```

### Step 5: Fetch Failed Count

```typescript
useEffect(() => {
  const fetchFailedCount = async () => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/workflows/${workflowId}/enrollments?status=failed,retrying`
      );
      const data = await res.json();
      setFailedCount(data.data?.enrollments?.length || 0);
    } catch (error) {
      console.error('Failed to fetch failed count:', error);
    }
  };

  if (workspaceId && workflowId) {
    fetchFailedCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchFailedCount, 30000);
    return () => clearInterval(interval);
  }
}, [workspaceId, workflowId]);
```

---

## Testing the New Features

### Test Mode Usage

1. Click **"Test Workflow"** button
2. Select a test contact from dropdown
3. Check options:
   - ✅ **Dry Run** - No real actions (recommended for first test)
   - ✅ **Fast Forward** - Skip delays
4. Click **"Start Test"**
5. View step-by-step execution
6. Compare test time vs. production time
7. Click **"Run Again"** to test different scenarios

**Example Test Results:**
```
Step 1: Send Welcome Email ✓
  → Simulated (dry run)
  → Duration: 0.5s

Step 2: Wait 3 Days ✓
  → Skipped 259,200,000ms delay
  → Duration: 0.1s

Step 3: Check Email Opened? ✓
  → Condition TRUE: Taking YES path
  → Duration: 0.2s

Step 4: Create Follow-up Task ✓
  → Simulated (dry run)
  → Duration: 0.3s

Total Test Duration: 1.1s
Production Duration: 3 days (259,200s)
```

### Failed Enrollments Management

**When enrollments fail:**

1. **Badge appears** showing failure count
2. Click badge to open panel
3. See all failed enrollments with:
   - Entity name
   - Failed step
   - Error message
   - Attempt count
   - Next retry time
4. **Actions available:**
   - **Retry** - Manually retry immediately
   - **Cancel** - Remove from queue

**Automatic Retry Schedule:**
- Attempt 1 fails → Retry in **5 minutes**
- Attempt 2 fails → Retry in **5 minutes**
- Attempt 3 fails → Mark as **FAILED** (no more retries)

---

## Using the 5th Template (Meeting No-Show)

### Features
- **Branching logic** based on email engagement
- **Smart follow-up** strategy
- **Automatic tagging**

### Steps
1. Open workflow builder
2. Click **"Use Template"**
3. Select **"Meeting No-Show Follow-up"** 📅
4. Template creates:
   - Tag as "No-Show"
   - Send reschedule email
   - Wait 2 days
   - **Branch on email opened:**
     - ✓ YES → Create task for sales rep
     - ✗ NO → Send final reminder
5. Customize email copy
6. Activate workflow

---

## API Endpoints Reference

### Test Workflow
```http
POST /api/workspaces/:workspaceId/workflows/:workflowId/test

Body:
{
  "entityId": "contact_id_here",
  "entityType": "contact",
  "dryRun": true,
  "fastForward": true
}
```

### Get Failed Enrollments
```http
GET /api/workspaces/:workspaceId/workflows/:workflowId/enrollments?status=failed,retrying
```

### Retry Failed Enrollment
```http
POST /api/workspaces/:workspaceId/workflows/:workflowId/enrollments/:enrollmentId/retry
```

---

## Troubleshooting

### Test Mode Issues

**Problem:** "No contacts available"
- **Solution:** Add at least one contact to your workspace before testing

**Problem:** Test shows errors
- **Solution:** Check workflow configuration, ensure all actions have required fields

**Problem:** Condition doesn't branch correctly
- **Solution:** Verify entity has the field you're checking, test with different contacts

### Failed Enrollments Issues

**Problem:** Enrollments keep failing at same step
- **Solution:** Fix the workflow configuration for that step (e.g., check SMTP settings for email actions)

**Problem:** Failed count doesn't update
- **Solution:** Refresh page or wait 30 seconds for auto-refresh

**Problem:** Retry button doesn't work
- **Solution:** Check browser console for errors, verify API endpoints are accessible

---

## Best Practices

### Before Activating a Workflow
1. ✅ Run **validation** (check for errors)
2. ✅ **Test with dry run** = true
3. ✅ **Test with dry run** = false (1-2 contacts)
4. ✅ Review test results for errors
5. ✅ Verify condition branching works correctly
6. ✅ Check email templates render properly
7. ✅ Activate workflow

### Monitoring Active Workflows
- Check **failed enrollments panel daily**
- Investigate patterns (same step failing repeatedly)
- Fix root causes before retrying
- Cancel enrollments with persistent errors
- Monitor auto-retry status

### Error Handling Strategy
- **Transient errors** (network, SMTP timeout) → Retry automatically
- **Configuration errors** (missing fields, invalid data) → Fix workflow, then retry
- **Permanent errors** (deleted entity, invalid email) → Cancel enrollment

---

## Performance Tips

### Test Mode
- Use dry run for initial tests (faster, no side effects)
- Use fast forward to skip delays
- Test with real actions sparingly
- Limit test runs to avoid quota usage

### Failed Enrollments
- Review failures once per day
- Batch retry similar failures after fixing root cause
- Cancel obviously invalid enrollments
- Set up monitoring alerts for critical workflows (future enhancement)

---

## Feature Comparison

| Action | Test Mode | Real Enrollment |
|--------|-----------|-----------------|
| Send Email | Simulated (dry run) or Real | Real |
| Update Fields | Simulated or Real | Real |
| Create Tasks | Simulated or Real | Real |
| Delays | Skipped (fast forward) or Real | Real |
| Conditions | Evaluated | Evaluated |
| Error Handling | Caught & displayed | Retry with backoff |

---

## Quick Reference Commands

```bash
# Check TypeScript errors
cd frontend && npx tsc --noEmit --skipLibCheck

# Start dev server
npm run dev

# Build for production
npm run build

# View workflow logs
# (check console for emoji-prefixed logs)
# ⚡ = Action execution
# ⏰ = Delay scheduled
# 🔀 = Condition evaluated
# ❌ = Error occurred
# ⚠️ = Warning/retry
```

---

## Next Steps

1. ✅ Integrate components into your UI
2. ✅ Test the test mode feature
3. ✅ Create a test workflow with branching
4. ✅ Simulate a failure and test retry logic
5. ✅ Try all 5 templates
6. ✅ Deploy to production
7. ✅ Monitor failed enrollments panel

---

## Support & Documentation

- **Full Documentation:** See `WORKFLOW_COMPLETION_SUMMARY.md`
- **Code Examples:** Check component files for detailed comments
- **API Documentation:** See summary document for complete API reference
- **Troubleshooting:** Check console logs with emoji prefixes

---

**Your workflow system is now 100% complete and ready for production! 🎉**

*Last Updated: December 8, 2024*
