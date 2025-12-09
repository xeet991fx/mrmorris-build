# 📚 Mr. Morris CRM - Workflow System Guide

**A Complete Guide to Automated Workflows - No Code, Just Instructions**

---

## 🎯 What Are Workflows?

Workflows are automated sequences of actions that run when specific events occur. Think of them as "if this happens, then do that" rules for your CRM.

**Example**: When a new contact is created → Send welcome email → Wait 2 days → Send follow-up → If opened → Notify sales team

---

## 🔄 How Workflows Work

### The Execution Flow

```
1. TRIGGER EVENT OCCURS
   (Contact created, deal updated, form submitted, etc.)
          ↓
2. ENROLLMENT CHECK
   - Does contact match enrollment criteria?
   - Already enrolled? (check re-enrollment rules)
          ↓
3. WORKFLOW STARTS
   - Contact is enrolled
   - First step executes immediately
          ↓
4. STEP EXECUTION (Loop)
   - Execute current step (email, task, delay, etc.)
   - Calculate next execution time
   - Move to next step
          ↓
5. COMPLETION
   - Check if goal criteria met
   - Update stats (completed, goal_met, failed)
   - Remove from active enrollments
```

---

## 📌 Step Types

### 1. Triggers (Starting Points)

| Trigger | Description | Use Case |
|---------|-------------|----------|
| **Contact Created** | Fires when new contact added | Welcome sequences |
| **Contact Updated** | Fires when contact field changes | Status change notifications |
| **Deal Stage Changed** | Fires when deal moves between stages | Pipeline automation |
| **Deal Created** | Fires when new deal is created | Opportunity welcome |
| **Email Opened** | Fires when tracked email is opened | Engagement follow-up |
| **Email Clicked** | Fires when email link is clicked | Interest-based actions |
| **Form Submitted** | Fires when form is completed | Lead capture sequences |
| **Manual** | Triggered by user action | One-time campaigns |

---

### 2. Actions (Things That Happen)

| Action | What It Does | Configuration |
|--------|--------------|---------------|
| **Send Email** | Sends automated email | Subject, body, template, recipient |
| **Create Task** | Creates a task/reminder | Title, description, due date, assignee |
| **Send Notification** | Notifies team member | Message, recipient user |
| **Update Field** | Changes contact/deal field | Field name, new value |
| **Add Tag** | Adds tag to contact | Tag name |
| **Remove Tag** | Removes tag from contact | Tag name |
| **Update Lead Score** | Adjusts lead qualification | Points (+/-) or event type |
| **Enroll in Workflow** | Starts another workflow | Target workflow ID |

---

### 3. Delays (Waiting Periods)

| Delay Type | Description | Example |
|------------|-------------|---------|
| **Duration** | Wait fixed time | Wait 3 days |
| **Until Date** | Wait until specific date | Wait until Dec 25, 2025 |
| **Until Time** | Wait until specific time | Wait until 9:00 AM |
| **Until Weekday** | Wait until day of week | Wait until next Monday |

---

### 4. Conditions (Branching Logic)

Create "if/else" logic with 10 operators:

| Operator | Example |
|----------|---------|
| Equals | Status equals "Customer" |
| Not Equals | Source not equals "Cold Call" |
| Contains | Email contains "@company.com" |
| Not Contains | Name not contains "Test" |
| Greater Than | Lead Score > 50 |
| Less Than | Days Since Contact < 30 |
| Is Empty | Phone is empty |
| Is Not Empty | Email is not empty |
| Is True | Subscribed is true |
| Is False | Unsubscribed is false |

---

### 5. Wait for Event (Event-Driven Pause)

Pause workflow until specific event occurs:

| Event Type | Description | Timeout |
|------------|-------------|---------|
| Email Reply | Wait for email response | Optional (1-90 days) |
| Email Opened | Wait for email open | Optional |
| Link Clicked | Wait for link click | Optional |
| Form Submitted | Wait for form completion | Optional |
| Deal Stage Changed | Wait for deal update | Optional |

**Timeout Behavior**: If event doesn't occur within timeout, workflow can either continue to next step or exit.

---

## 📊 Lead Scoring System

### How It Works

Contacts automatically earn points based on behaviors:

| Behavior | Points | Grade Impact |
|----------|--------|--------------|
| Email Opened | +5 | → |
| Email Link Clicked | +10 | → |
| Form Submitted | +20 | ↑ |
| Demo Requested | +50 | ↑↑ |
| Deal Won | +100 | ↑↑↑ |
| Email Bounced | -10 | ↓ |
| Unsubscribed | -50 | ↓↓ |

### Grading Scale

| Grade | Score Range | Meaning | Color |
|-------|-------------|---------|-------|
| **A** | 80-100 | Hot lead - Ready to buy | 🟢 Green |
| **B** | 60-79 | Warm lead - Engaged | 🔵 Blue |
| **C** | 40-59 | Moderate interest | 🟡 Yellow |
| **D** | 20-39 | Low engagement | 🟠 Orange |
| **F** | 0-19 | Unengaged/Cold | ⚫ Gray |

### Score Decay

Inactive contacts lose 10% of their score after 30 days of no activity. This keeps lead quality fresh.

---

## 📧 Email Tracking

### Automatic Tracking

All workflow emails include:
- **Invisible tracking pixel** - Detects when email is opened
- **Wrapped links** - Tracks when links are clicked

### Automatic Scoring

When contacts engage:
- Open email → +5 points to lead score
- Click link → +10 points to lead score

### Triggering Workflows

Email events can trigger new workflows:
- `email_opened` trigger starts nurture sequence
- `email_clicked` trigger starts sales follow-up

---

## 🎯 Goal Tracking

### Setting Goals

Define success criteria for your workflow:
- "Contact becomes a customer (status = customer)"
- "Lead score reaches 60+ (Grade B or better)"
- "Deal moves to Closed Won"

### How Goals Work

1. Define goal criteria when creating workflow
2. After each enrollment completes, system checks if goal met
3. If criteria matches → Status = "goal_met"
4. If criteria doesn't match → Status = "completed"

### Analytics

Dashboard shows:
- Total enrolled
- Completed
- Goal conversion rate (goal_met ÷ completed)

---

## 🧪 Testing Workflows

### Test Mode Features

| Feature | Description |
|---------|-------------|
| **Dry Run** | Simulates workflow without sending emails or creating tasks |
| **Fast Forward** | Skips delays to test entire flow quickly |
| **Step-by-Step** | Shows each step result as it executes |
| **Contact Selection** | Test with specific contact |

### How to Test

1. Open workflow in builder
2. Click "Test Workflow" button
3. Select a contact
4. Choose: Dry Run (safe) or Live Test (sends real emails)
5. Watch step-by-step execution
6. Review results

---

## 📦 Bulk Enrollment

### Manual Bulk Enrollment

1. Go to workflow detail page
2. Click "Bulk Enroll" button
3. Select contacts (checkboxes or filter)
4. Click "Enroll Selected"
5. All matching contacts start workflow

### CSV Import Enrollment

1. Export contacts to CSV
2. Upload CSV to bulk enrollment
3. Map columns to contact fields
4. Contacts are created and enrolled automatically

---

## ⚡ Workflow Templates

### Pre-Built Templates

| Template | Purpose |
|----------|---------|
| **Welcome Sequence** | New contact nurturing |
| **Lead Nurture** | Cold lead warming |
| **Re-engagement** | Inactive contact revival |
| **Deal Follow-up** | Pipeline acceleration |
| **Customer Onboarding** | Post-sale automation |

### Using Templates

1. Click "Create Workflow" or "Use Template"
2. Select template from library
3. Customize steps as needed
4. Activate workflow

---

## ⚠️ Error Handling

### Automatic Retries

Failed steps retry automatically:
- 1st retry: 5 minutes later
- 2nd retry: 30 minutes later
- 3rd retry: 2 hours later
- After 3 failures: Marked as "failed"

### Failed Enrollments Panel

View and manage failures:
- See error reason
- Retry individual enrollments
- Cancel stuck enrollments
- Bulk retry option

---

## 📈 Analytics Dashboard

### Workflow Metrics

| Metric | Description |
|--------|-------------|
| **Total Enrolled** | Contacts that started workflow |
| **Currently Active** | In progress now |
| **Completed** | Finished all steps |
| **Goal Met** | Achieved success criteria |
| **Failed** | Stopped due to errors |

### Funnel Visualization

See conversion at each step:
```
Step 1: Email Sent      500 (100%)
Step 2: Opened         350 (70%)
Step 3: Clicked        175 (35%)
Step 4: Form Filled     87 (17%)
Step 5: Became Customer 43 (8.6%)
```

---

## 🏗️ Building Your First Workflow

### Step-by-Step Guide

1. **Navigate**: Go to Workflows page in your project

2. **Create**: Click "Create Workflow" button

3. **Name It**: Give your workflow a descriptive name

4. **Add Trigger**: 
   - Click the trigger node
   - Select trigger type (e.g., "Contact Created")
   - Add optional enrollment criteria

5. **Add Steps**:
   - Click "+" between nodes to add steps
   - Choose step type (Action, Delay, Condition)
   - Configure each step

6. **Connect Steps**:
   - Drag connections between nodes
   - For conditions, connect both Yes and No paths

7. **Set Goal** (Optional):
   - Define success criteria
   - Enables conversion tracking

8. **Test**:
   - Use Test Mode to verify flow
   - Check for errors or gaps

9. **Activate**:
   - Click "Activate" button
   - Workflow starts processing matching events

---

## ✅ Best Practices

### Do's

- ✅ Always test before activating
- ✅ Add delays between email steps (2-3 days minimum)
- ✅ Use conditions to personalize paths
- ✅ Set realistic goals for tracking
- ✅ Monitor analytics weekly
- ✅ Use lead scoring to prioritize

### Don'ts

- ❌ Don't skip testing
- ❌ Don't send too many emails too fast (spam risk)
- ❌ Don't create loops without exit conditions
- ❌ Don't forget to update stale workflows
- ❌ Don't ignore failed enrollments

---

## 🔮 Coming Soon

| Feature | Description | ETA |
|---------|-------------|-----|
| **Webhooks** | Connect external tools | Sprint 3 |
| **Timezone Support** | Send at optimal local time | Sprint 3 |
| **SMS & WhatsApp** | Multi-channel messaging | Sprint 3 |
| **AI Workflow Builder** | Natural language creation | Sprint 4 |
| **Workflow Versioning** | Track changes over time | Sprint 4 |
| **A/B Testing** | Split test different paths | Sprint 4 |

---

## 📞 Need Help?

- Check the failed enrollments panel for errors
- Review workflow analytics for performance
- Use test mode to debug issues
- Contact support for complex automation needs

---

**Last Updated**: December 9, 2025  
**Workflow System Status**: Production Ready ✅
