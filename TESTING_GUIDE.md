# N8N-Style Workflow Testing Guide

## 🎯 Test Workflow #1: Basic Loop with Variables

### Setup:
1. Create a new workflow called "Test Loop Workflow"
2. Add these nodes in order:

```
[Trigger: Contact Created]
    ↓
[Loop: Iterate Test Array]
    ↓
[Action: Update Field]
```

### Configuration:

**Trigger Node:**
- Trigger Type: `contact_created`

**Loop Node:**
- Source Array: `testContacts`
- Source Type: `variable`
- Item Variable: `contact`
- Index Variable: `idx`
- Mode: `sequential`
- Max Iterations: `10`
- Aggregate Results: ✅ (checked)
- Result Variable: `processedContacts`

**Action Node (inside loop):**
- Action Type: `update_field`
- Field: `notes`
- Value: `Processed contact {{contact.firstName}} at index {{idx}}`

### Backend Test Setup:

Before running, you need to seed the workflow with test data. Create a test contact enrollment:

```typescript
// In MongoDB or via API, create enrollment with dataContext:
{
  workflowId: <your-workflow-id>,
  entityId: <test-contact-id>,
  entityType: "Contact",
  status: "active",
  currentStepId: <loop-step-id>,
  dataContext: {
    variables: {
      testContacts: [
        { firstName: "John", lastName: "Doe", email: "john@test.com" },
        { firstName: "Jane", lastName: "Smith", email: "jane@test.com" },
        { firstName: "Bob", lastName: "Johnson", email: "bob@test.com" }
      ]
    }
  }
}
```

### Expected Results:
✅ Loop executes 3 times (array length)
✅ Each iteration sets `contact` and `idx` variables
✅ Action node runs 3 times with different values
✅ `processedContacts` array contains 3 results
✅ Enrollment completes successfully

---

## 🎯 Test Workflow #2: HTTP Request + Transform

### Setup:
```
[Trigger: Manual]
    ↓
[HTTP Request: Fetch User Data]
    ↓
[Transform: Extract Email]
    ↓
[Action: Send Email]
```

### Configuration:

**HTTP Request Node:**
- Method: `GET`
- URL: `https://jsonplaceholder.typicode.com/users/1`
- Authentication: `None`
- Response Handling:
  - Extract Path: `email`
  - Save to Variable: `apiEmail`

**Transform Node:**
- Action Type: `transform_set`
- Operations:
  ```json
  [
    {
      "variable": "userEmail",
      "value": "{{apiEmail}}"
    }
  ]
  ```

**Action Node:**
- Action Type: `send_email`
- To: `{{userEmail}}`
- Subject: `Test Email`
- Body: `This email was sent via HTTP workflow to {{userEmail}}`

### Test Execution:
```bash
# Via MongoDB or API, trigger the workflow manually
# Check backend logs for:
```

### Expected Results:
✅ HTTP request fetches data from API
✅ Response contains email field
✅ Email saved to `apiEmail` variable
✅ Transform sets `userEmail` variable
✅ Email action receives correct email address
✅ Workflow completes

---

## 🎯 Test Workflow #3: AI Agent Integration

### Setup:
```
[Trigger: Contact Created]
    ↓
[AI Agent: Analyze Contact]
    ↓
[Action: Update Lead Score]
```

### Configuration:

**AI Agent Node:**
- Task Prompt:
  ```
  Analyze this contact and determine if they are a qualified lead.
  Contact: {{contact.firstName}} {{contact.lastName}}
  Email: {{contact.email}}
  Company: {{contact.company}}

  Return a JSON object with: { "qualified": true/false, "score": 1-100, "reason": "explanation" }
  ```
- Agent Type: `auto`
- Include Entity Data: ✅
- Include Variables: ✅
- Parse as JSON: ✅
- Response Variable: `aiAnalysis`
- Timeout: `60000` (60s)

**Action Node:**
- Action Type: `update_lead_score`
- Score: `{{aiAnalysis.score}}`

### Expected Results:
✅ AI agent receives contact data
✅ Agent reasons about qualification
✅ Returns structured JSON response
✅ Response parsed and stored in `aiAnalysis`
✅ Lead score updated with AI-generated score
✅ Workflow completes

---

## 🎯 Test Workflow #4: Try/Catch Error Handling

### Setup:
```
[Trigger: Manual]
    ↓
[Try/Catch: API Call Handler]
    ├─ SUCCESS: [HTTP Request: External API]
    └─ ERROR: [Action: Log Error]
```

### Configuration:

**Try/Catch Node:**
- Retry on Error: ✅
- Max Retries: `3`
- Retry Delay: `1000ms`

**HTTP Request (Try Block):**
- Method: `GET`
- URL: `https://api.example.com/invalid-endpoint` (will fail)
- Timeout: `5000ms`

**Action (Error Block):**
- Action Type: `send_notification`
- Message: `API call failed after 3 retries: {{error.message}}`

### Expected Results:
✅ HTTP request fails
✅ Retries 3 times with 1s delay
✅ After all retries fail, routes to error branch
✅ Error action executes with error details
✅ Workflow completes (doesn't crash)

---

## 🎯 Test Workflow #5: Slack Integration

### Setup:
```
[Trigger: Deal Won]
    ↓
[Slack: Post to Sales Channel]
```

### Configuration:

**Slack Node:**
- **Credentials Tab:**
  - Bot Token: `xoxb-your-slack-bot-token` (get from https://api.slack.com/apps)
  - Workspace ID: (optional)

- **Action Tab:**
  - Action: `post_message`
  - Channel: `#sales-wins`
  - Message:
    ```
    🎉 New Deal Won!

    Contact: {{contact.firstName}} {{contact.lastName}}
    Deal Value: ${{deal.value}}
    Company: {{contact.company}}

    Great work team! 💪
    ```

- **Response Tab:**
  - Response Variable: `slackResponse`

### Test Execution:
1. Get a Slack bot token from your Slack workspace
2. Invite the bot to #sales-wins channel
3. Trigger workflow with test deal

### Expected Results:
✅ Slack API receives message
✅ Message posts to #sales-wins channel
✅ Placeholders replaced with actual data
✅ Message timestamp stored in `slackResponse`
✅ Workflow completes

---

## 🎯 Test Workflow #6: Parallel Execution

### Setup:
```
[Trigger: Contact Created]
    ↓
[Parallel: Split Processing]
    ├─ Branch 1: [Action: Send Welcome Email]
    ├─ Branch 2: [Action: Add to CRM List]
    └─ Branch 3: [HTTP: Enrich from Apollo]
    ↓
[Merge: Join Results]
    ↓
[Action: Update Contact]
```

### Configuration:

**Parallel Node:**
- Mode: `wait_all` (wait for all branches)
- Timeout: `30000ms`

**Branch 1 (Email):**
- Action: `send_email`
- To: `{{contact.email}}`
- Subject: `Welcome!`

**Branch 2 (CRM List):**
- Action: `add_tag`
- Tag: `new-contact`

**Branch 3 (Enrichment):**
- HTTP Request to Apollo API
- Save to: `enrichedData`

**Merge Node:**
- Aggregate Results: ✅
- Result Variable: `branchResults`

### Expected Results:
✅ All 3 branches execute simultaneously
✅ Email sends
✅ Tag added
✅ HTTP enrichment completes
✅ Merge waits for all to finish
✅ Results aggregated in `branchResults`
✅ Update action runs with all data

---

## 🛠️ Backend Testing Commands

### 1. Check Workflow Execution Logs
```bash
# In backend directory
cd backend

# Watch logs in real-time
npm run dev

# Look for these log patterns:
# "🔁 Starting loop: X iterations"
# "🤖 Invoking AI agent with task:"
# "📨 Executing Slack action: post_message"
# "✅ Loop completed: X items processed"
```

### 2. Query MongoDB for Execution Results
```javascript
// Connect to MongoDB
use mrmorris-crm

// Check workflow enrollments
db.workflowenrollments.find({
  workflowId: ObjectId("your-workflow-id")
}).sort({ createdAt: -1 }).limit(5)

// Check for dataContext
db.workflowenrollments.findOne(
  { _id: ObjectId("enrollment-id") },
  { dataContext: 1, stepsExecuted: 1, status: 1 }
)

// Verify loop results stored
db.workflowenrollments.findOne(
  { _id: ObjectId("enrollment-id") },
  { "dataContext.variables.processedContacts": 1 }
)

// Check AI agent responses
db.workflowenrollments.findOne(
  { _id: ObjectId("enrollment-id") },
  { "dataContext.variables.aiAnalysis": 1 }
)
```

### 3. API Testing with curl/Postman

**Trigger a workflow manually:**
```bash
curl -X POST http://localhost:5000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "your-workflow-id",
    "entityId": "test-contact-id",
    "entityType": "Contact"
  }'
```

**Check workflow status:**
```bash
curl http://localhost:5000/api/workflows/your-workflow-id/enrollments
```

---

## 🔍 Debugging Checklist

If something doesn't work, check:

### Frontend Issues:
- [ ] Browser console for React errors
- [ ] Network tab for failed API calls
- [ ] Node appears on canvas after drop
- [ ] Config panel opens when node clicked
- [ ] All form fields are editable

### Backend Issues:
- [ ] Backend server running (`npm run dev`)
- [ ] No TypeScript compilation errors
- [ ] MongoDB connection successful
- [ ] Action registered in registry (`backend/src/services/workflow/actions/index.ts`)
- [ ] Step executor handles new step type (`backend/src/services/workflow/stepExecutor.ts`)

### Execution Issues:
- [ ] Enrollment status is `active` not `paused`
- [ ] `currentStepId` points to valid step
- [ ] `dataContext.variables` contains expected data
- [ ] Loop source array is not empty
- [ ] HTTP URLs are reachable
- [ ] Slack bot token is valid
- [ ] AI agent has necessary permissions

---

## 📊 Success Criteria

Your implementation is **fully working** if:

✅ All 13+ node types appear in palette
✅ Search filters nodes correctly
✅ All nodes can be dragged to canvas
✅ Config panels open for all node types
✅ Loop executes and stores results in dataContext
✅ AI agent receives task and returns response
✅ HTTP requests fetch external data
✅ Slack messages post successfully (with real token)
✅ Try/Catch handles errors and routes correctly
✅ Parallel branches execute simultaneously
✅ Transform nodes manipulate variables
✅ Workflows complete without crashing
✅ Results stored in MongoDB enrollment.dataContext

---

## 🎓 Quick Test Script

Run this simplified test:

1. **Create Basic Test Workflow:**
   - Drag Trigger → Loop → Action
   - Configure loop with static array
   - Save workflow

2. **Create Test Enrollment in MongoDB:**
   ```javascript
   db.workflowenrollments.insertOne({
     workflowId: ObjectId("your-workflow-id"),
     entityId: ObjectId("test-contact-id"),
     entityType: "Contact",
     status: "active",
     currentStepId: "loop-step-id",
     dataContext: {
       variables: {
         testArray: [1, 2, 3, 4, 5]
       }
     },
     stepsExecuted: [],
     createdAt: new Date()
   })
   ```

3. **Trigger Workflow Processor:**
   - Backend should auto-process enrollments
   - Watch logs for loop execution
   - Check MongoDB for completed status

4. **Verify Results:**
   ```javascript
   db.workflowenrollments.findOne(
     { _id: ObjectId("enrollment-id") },
     { status: 1, "dataContext.variables": 1, stepsExecuted: 1 }
   )
   // Should show:
   // - status: "completed"
   // - dataContext.variables with loop results
   // - stepsExecuted array with all steps
   ```

---

## 🚨 Common Issues & Fixes

### Issue: Nodes don't appear when dropped
**Fix:** Check browser console. Verify `onDrop` handler in `page.tsx` includes all new node types.

### Issue: Config panel is blank
**Fix:** Check `WorkflowConfigPanel.tsx` has import and condition for the node type.

### Issue: Loop doesn't execute
**Fix:**
- Verify source array exists in `dataContext.variables`
- Check array is not empty
- Verify loop step has `type: 'loop'` not `type: 'action'`

### Issue: AI agent doesn't respond
**Fix:**
- Check `invokeAgentV2` is imported correctly
- Verify workspace and user IDs are valid
- Check backend logs for agent errors
- Ensure timeout is sufficient (60s+)

### Issue: Slack messages don't send
**Fix:**
- Verify bot token starts with `xoxb-`
- Check bot is invited to target channel
- Test token with Slack API tester
- Check backend logs for Slack API errors

---

## 🎉 Congratulations!

If all tests pass, you have successfully built a **production-ready n8n-style workflow automation platform** with:
- Visual workflow builder
- 13+ node types
- Slack integration
- AI agent integration
- HTTP API calls
- Loop iteration
- Error handling
- Parallel execution
- Variable system
- Expression evaluator

This is enterprise-grade workflow automation! 🚀
