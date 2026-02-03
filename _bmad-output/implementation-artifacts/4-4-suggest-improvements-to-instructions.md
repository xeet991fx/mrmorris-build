# Story 4.4: Suggest Improvements to Instructions

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want AI Copilot to analyze my instructions and suggest improvements,
So that I can build more effective agents.

## Acceptance Criteria

**AC1: Provide Specific Improvement Suggestions**
- User asks: "Review my instructions and suggest improvements"
- Copilot analyzes current agent instructions field content
- Provides categorized suggestions:
  - ✅ Good: Positive feedback on what's working well
  - ⚠️ Suggestion: Areas that need improvement
  - 💡 Optimization: Performance/efficiency improvements
- Each suggestion is specific and actionable with examples

**AC2: Detect Missing Error Handling**
- Copilot identifies actions without fallback logic
- Example: "Send email" without handling send failures
- Suggests: "Add fallback: 'If email fails, create task for manual follow-up'"

**AC3: Detect Redundant Steps**
- Copilot identifies duplicate or similar logic
- Suggests combining steps with before/after comparison
- Shows combined version of redundant steps

**AC4: Suggest Personalization Improvements**
- Detects generic text without variable usage
- Suggests: "Add personalization using @contact.firstName and @company.name"
- Shows example with variables inserted

**AC5: Warn About Rate Limits**
- Copilot detects high-volume operations (e.g., "Send 500 emails")
- Warns: "⚠️ This may exceed daily email limit (100/day)"
- Suggests: "Consider splitting into multiple runs or increasing limit"

**AC6: Validate Resources Exist**
- Checks if referenced templates exist in workspace
- Checks if referenced custom fields are defined
- If not found: Lists existing resources as alternatives
- Format: "⚠️ Template 'xyz' not found. Use: 'Outbound v2', 'Follow-up 1'"

**AC7: Apply/Dismiss Individual Suggestions**
- Each suggestion has [Apply] and [Dismiss] buttons
- Clicking Apply: Updates instructions, shows confirmation, 5-second undo window
- Clicking Dismiss: Removes suggestion from view
- Multiple suggestions can be accepted/dismissed independently

**AC8: Best Practices Highlighting**
- Copilot highlights when user follows best practices
- Format: "✅ Best practice: You're using wait steps before follow-ups"
- Suggests additional improvements: "Consider A/B testing different templates"

## Tasks / Subtasks

### Backend Implementation

- [ ] Task 1: Create AgentCopilotService.reviewInstructions() method (AC: 1-8)
  - [ ] 1.1 Add `reviewInstructions()` method signature with workspaceId, agentId, instructions parameters
  - [ ] 1.2 Load workspace context via existing `_loadWorkspaceData()` method
  - [ ] 1.3 Build comprehensive review prompt with `buildReviewPrompt()` helper
  - [ ] 1.4 Call Gemini 2.5 Pro with structured output for categorized suggestions
  - [ ] 1.5 Parse response into structured format: { good: [], suggestions: [], optimizations: [] }
  - [ ] 1.6 Return validation warnings with resource checks (templates, fields)

- [ ] Task 2: Implement buildReviewPrompt() helper (AC: 1-8)
  - [ ] 2.1 Add system prompt defining review role and categories (Good, Suggestion, Optimization)
  - [ ] 2.2 Include workspace context (templates, custom fields, integrations)
  - [ ] 2.3 Add best practices knowledge base (wait steps, personalization, error handling, rate limits)
  - [ ] 2.4 Include 8 core actions with proper syntax
  - [ ] 2.5 Add template validation rules: Check against workspace EmailTemplate collection
  - [ ] 2.6 Add custom field validation rules: Check against CustomFieldDefinition collection
  - [ ] 2.7 Add rate limit awareness: Email 100/day, LinkedIn 100/day, Slack API 1 req/sec
  - [ ] 2.8 Format user instructions as DATA input with security boundary
  - [ ] 2.9 Define expected output format (JSON with categories and specific suggestions)

- [ ] Task 3: Implement resource validation (AC: 6)
  - [ ] 3.1 Add `validateTemplateReferences()` helper that extracts template names from instructions
  - [ ] 3.2 Query EmailTemplate collection to check if templates exist
  - [ ] 3.3 Return missing templates with alternatives (top 5 most-used workspace templates)
  - [ ] 3.4 Add `validateCustomFieldReferences()` helper that extracts @contact.{field} patterns
  - [ ] 3.5 Query CustomFieldDefinition to check if fields exist
  - [ ] 3.6 Return missing fields with available field suggestions

- [ ] Task 4: Credit tracking and performance (AC: All)
  - [ ] 4.1 Set credit cost to 2 credits per review (complex analysis)
  - [ ] 4.2 Implement pre-flight credit check using existing `checkWorkspaceCredits()`
  - [ ] 4.3 Implement post-completion credit deduction using fire-and-forget pattern
  - [ ] 4.4 Set timeout to 8 seconds (similar to workflow generation complexity)
  - [ ] 4.5 Use `thinking_level: "medium"` for Gemini API (analysis task, moderate depth)

- [ ] Task 5: API route integration (AC: 7)
  - [ ] 5.1 Add POST `/api/workspaces/:workspaceId/agents/:agentId/copilot/review` endpoint
  - [ ] 5.2 Extract instructions from request body
  - [ ] 5.3 Call AgentCopilotService.reviewInstructions()
  - [ ] 5.4 Return structured JSON response (not SSE, single response)
  - [ ] 5.5 Include resource validation warnings in response
  - [ ] 5.6 Handle errors: 404 agent not found, 402 insufficient credits, 500 server error

### Frontend Implementation

- [ ] Task 6: Create ReviewSuggestionsPanel component (AC: 1, 7, 8)
  - [ ] 6.1 Create new component at `frontend/components/agents/copilot/ReviewSuggestionsPanel.tsx`
  - [ ] 6.2 Accept props: suggestions (parsed from API), onApply, onDismiss callbacks
  - [ ] 6.3 Render three sections: Good (✅), Suggestions (⚠️), Optimizations (💡)
  - [ ] 6.4 Each suggestion has [Apply] and [Dismiss] buttons
  - [ ] 6.5 Apply button shows diff preview modal before confirming
  - [ ] 6.6 Dismiss button removes suggestion from view with animation
  - [ ] 6.7 Style with Tailwind and shadcn/ui components (Card, Badge, Button)

- [ ] Task 7: Implement apply/undo logic (AC: 7)
  - [ ] 7.1 Create `useInstructionHistory` hook for undo functionality
  - [ ] 7.2 Store last 5 instruction versions in Zustand state
  - [ ] 7.3 On Apply: Update instructions field, store previous version
  - [ ] 7.4 Show success toast with [Undo] button (5-second countdown timer)
  - [ ] 7.5 Undo button restores previous version from history
  - [ ] 7.6 Clear undo window after 5 seconds automatically

- [ ] Task 8: Add "Review Instructions" button to agent builder (AC: 1)
  - [ ] 8.1 Add button to agent builder form below instructions field
  - [ ] 8.2 Button text: "Review Instructions" with icon (🔍 or magnifying glass)
  - [ ] 8.3 On click: Call API `/copilot/review` with current instructions
  - [ ] 8.4 Show loading spinner during analysis
  - [ ] 8.5 Open ReviewSuggestionsPanel in modal or side panel on response
  - [ ] 8.6 Disable button if instructions field is empty

- [ ] Task 9: Resource validation warnings display (AC: 6)
  - [ ] 9.1 Parse validation warnings from API response
  - [ ] 9.2 Display missing templates with alert component (⚠️)
  - [ ] 9.3 Show alternative templates as clickable options
  - [ ] 9.4 Display missing custom fields with alert
  - [ ] 9.5 Show available custom fields as suggestions
  - [ ] 9.6 Allow inline replacement (click alternative → updates instructions)

### Testing

- [ ] Task 10: Unit tests for AgentCopilotService (AC: 1-8)
  - [ ] 10.1 Test reviewInstructions - Returns structured suggestions (AC1)
  - [ ] 10.2 Test buildReviewPrompt - Includes workspace context and best practices (AC1, AC8)
  - [ ] 10.3 Test error handling detection - Identifies missing fallbacks (AC2)
  - [ ] 10.4 Test redundancy detection - Finds duplicate steps (AC3)
  - [ ] 10.5 Test personalization suggestions - Detects generic text (AC4)
  - [ ] 10.6 Test rate limit warnings - Flags high-volume operations (AC5)
  - [ ] 10.7 Test validateTemplateReferences - Returns missing templates (AC6)
  - [ ] 10.8 Test validateCustomFieldReferences - Returns missing fields (AC6)
  - [ ] 10.9 Test credit tracking - Deducts 2 credits per review
  - [ ] 10.10 Test timeout enforcement - 8-second limit

- [ ] Task 11: Integration tests for API routes (AC: 1-7)
  - [ ] 11.1 Test POST /copilot/review with valid instructions → Returns categorized suggestions
  - [ ] 11.2 Test POST /copilot/review with missing templates → Returns validation warnings
  - [ ] 11.3 Test POST /copilot/review with missing fields → Returns field suggestions
  - [ ] 11.4 Test POST /copilot/review with invalid workspace → 404 error
  - [ ] 11.5 Test POST /copilot/review with invalid agent → 404 error
  - [ ] 11.6 Test POST /copilot/review with insufficient credits → 402 error
  - [ ] 11.7 Test POST /copilot/review with empty instructions → 400 error

- [ ] Task 12: E2E testing for all acceptance criteria (AC: 1-8)
  - [ ] 12.1 Manual test AC1: Click "Review Instructions" → Verify categorized suggestions
  - [ ] 12.2 Manual test AC2: Instructions without fallbacks → Verify error handling suggestion
  - [ ] 12.3 Manual test AC3: Redundant steps → Verify combined version shown
  - [ ] 12.4 Manual test AC4: Generic text → Verify personalization suggestion
  - [ ] 12.5 Manual test AC5: High-volume operation → Verify rate limit warning
  - [ ] 12.6 Manual test AC6: Invalid template name → Verify alternatives listed
  - [ ] 12.7 Manual test AC7: Click Apply → Verify instructions updated, undo works
  - [ ] 12.8 Manual test AC8: Best practices → Verify positive feedback shown
  - [ ] 12.9 Performance test: Verify <8 seconds response time for 90% of reviews

## Dev Notes

### 🎯 Story Mission

This story transforms AI Copilot from a **reactive assistant** into a **proactive code reviewer** that catches mistakes, suggests optimizations, and validates resources before agents go live. The critical value is preventing agent failures by catching issues at build time rather than execution time.

### 🔑 Critical Success Factors

**1. Comprehensive Analysis Engine (AC1-AC5)**
- Analyze instructions for 5 categories: error handling, redundancy, personalization, rate limits, best practices
- Each suggestion must be specific and actionable (not generic advice)
- Must detect patterns like "Send email" without error handling
- Must calculate operation volume (e.g., counting email sends)
- Show before/after examples for all suggestions

**2. Resource Validation is Non-Negotiable (AC6)**
- MUST query EmailTemplate collection to validate template references
- MUST query CustomFieldDefinition collection to validate field references
- Return specific alternatives when resources are missing
- Format: "Template 'xyz' not found. Use: 'Outbound v2' (234 uses), 'Follow-up 1' (89 uses)"
- Workspace isolation: Only show templates/fields from current workspace

**3. Best Practices Knowledge Base (AC8)**
- Document known good patterns: wait steps before follow-ups, personalization, conditional logic
- Highlight when user follows best practices with positive reinforcement
- Suggest advanced improvements even when basics are covered
- Examples: A/B testing, lead scoring integration, dynamic wait times

**4. Apply/Dismiss UX Must Be Smooth (AC7)**
- Each suggestion independently actionable
- Diff preview before applying (show old vs new)
- 5-second undo window with countdown timer
- Toast notifications for success/undo actions
- Suggestions removed from view when dismissed

**5. Structured Output Format**
- Return JSON, not plain text (easier to parse and display)
- Format:
  ```json
  {
    "good": ["You're using conditional logic effectively", "Wait steps are properly placed"],
    "suggestions": [
      {
        "category": "error_handling",
        "issue": "Send email action lacks fallback",
        "suggestion": "Add fallback: 'If email fails, create task for manual follow-up'",
        "priority": "high"
      }
    ],
    "optimizations": [
      {
        "issue": "Steps 3 and 7 are similar",
        "suggestion": "Combine into single instruction",
        "before": "Step 3: ...\nStep 7: ...",
        "after": "Combined: ..."
      }
    ],
    "validationWarnings": {
      "missingTemplates": ["xyz"],
      "availableTemplates": ["Outbound v2", "Follow-up 1"],
      "missingFields": ["customField1"],
      "availableFields": ["leadScore", "leadSource"]
    }
  }
  ```

### 🏗️ Architecture Context

**Tech Stack (Reuse from Stories 4.1-4.3):**
- Backend: Express.js + TypeScript, Mongoose 8.0, Google Gemini 2.5 Pro
- Frontend: Next.js 15, React 19, Zustand, Tailwind + shadcn/ui
- AI Model: `gemini-2.5-pro` with `thinking_level: "medium"` for analysis depth
- Response: Single JSON response (NOT SSE streaming - different from 4.1/4.3)

**Database Models (Required for Validation):**
- `EmailTemplate` - Validate template references (AC6)
- `CustomFieldDefinition` - Validate custom field references (AC6)
- `Agent` - Load current instructions for comparison
- `AgentCopilotConversation` - Store review history (optional, for learning)

**Rate Limit Knowledge (AC5):**
- Email: 100 sends/day (Gmail API limit)
- LinkedIn: 100 invitations/day (LinkedIn policy)
- Slack: 1 request/second (Tier 2 rate limit)
- Apollo.io: 200 API calls/month (free tier)
- Google Calendar: 100 requests/second (quota limit)

**Best Practices Knowledge Base (AC8):**
1. **Wait Steps:** Always add 3-7 day wait between initial outreach and follow-up
2. **Personalization:** Use @contact.firstName, @company.name in all outbound messages
3. **Error Handling:** Every external action needs fallback (If X fails, do Y)
4. **Conditional Logic:** Filter before high-volume actions (If CEO, then email)
5. **Rate Limits:** Batch operations, add delays between high-volume sends
6. **Testing:** Always test in Test Mode before going live
7. **Human Handoff:** Complex scenarios should create task for manual review
8. **Tagging:** Add tags after successful actions for segmentation

### 📁 Files to Create/Modify

**Backend (New Files):**
- `backend/src/services/AgentCopilotService.ts` - Add 4 new methods:
  - `reviewInstructions()` - Main review method
  - `buildReviewPrompt()` - System prompt builder with best practices
  - `validateTemplateReferences()` - Check templates exist
  - `validateCustomFieldReferences()` - Check fields exist

**Backend (Routes):**
- `backend/src/routes/agentCopilot.ts` - Add POST `/review` endpoint

**Frontend (New Files):**
- `frontend/components/agents/copilot/ReviewSuggestionsPanel.tsx` - Main UI component
- `frontend/hooks/useInstructionHistory.ts` - Undo functionality

**Frontend (Modify):**
- `frontend/components/agents/AgentBuilderForm.tsx` - Add "Review Instructions" button

**Tests (New Files):**
- `backend/src/services/__tests__/AgentCopilotService.review.test.ts` - Review-specific tests

### 🔄 Patterns to Reuse from Previous Stories

**Story 4.2 (Workspace Context Loading):**
```typescript
// Reuse _loadWorkspaceData() method (Lines 526-549)
private async _loadWorkspaceData(workspaceId: string) {
  const [templates, customFields, integrations] = await Promise.all([
    EmailTemplate.find({ workspace: workspaceId })
      .sort({ usageCount: -1 })
      .limit(20)
      .select('name description usageCount')
      .lean(),
    CustomFieldDefinition.find({ workspace: workspaceId })
      .select('fieldKey fieldLabel fieldType')
      .lean(),
    IntegrationCredential.find({ workspace: workspaceId, isValid: true })
      .select('type name')
      .lean()
  ]);
  return { templates, customFields, integrations };
}
```

**Story 4.3 (Credit Tracking Pattern):**
```typescript
// Pre-flight check (Lines 95-100)
const hasCredits = await this.checkWorkspaceCredits(workspaceId, 2);
if (!hasCredits) {
  throw new Error('Insufficient credits');
}

// Post-completion deduction (fire-and-forget)
this.deductCredits(workspaceId, 2).catch(err =>
  console.error('[AgentCopilotService] Failed to deduct credits:', err)
);
```

**Story 4.2 (Timeout Handling):**
```typescript
// Promise.race pattern with 8-second timeout
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Review timeout')), 8000)
);

const result = await Promise.race([
  this.reviewInstructions(workspaceId, agentId, instructions),
  timeoutPromise
]);
```

**NEW Pattern: JSON Response (Not SSE)**
```typescript
// Route handler for /review endpoint
router.post('/:agentId/copilot/review', authenticate, async (req, res) => {
  try {
    const { instructions } = req.body;
    const result = await agentCopilotService.reviewInstructions(
      req.params.workspaceId,
      req.params.agentId,
      instructions
    );
    res.json(result); // Single JSON response, not SSE
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 🚨 Common Pitfalls to Avoid

1. **Generic Suggestions** - Don't say "improve error handling" - say "Add: 'If email fails, create task'"
2. **Missing Resource Validation** - MUST check EmailTemplate and CustomFieldDefinition collections
3. **Streaming Mistake** - This is NOT SSE - single JSON response only (AC7 needs structured data)
4. **Workspace Isolation** - ALL queries must filter by workspace (templates, fields, integrations)
5. **Rate Limit Knowledge** - Must know actual limits (Gmail 100/day, LinkedIn 100/day, Slack 1 req/sec)
6. **Before/After Examples** - AC3 requires showing combined version, not just suggesting it
7. **Credit Cost** - 2 credits per review (not 1 like Q&A) - more complex analysis
8. **Timeout** - Use 8 seconds (same as generation) not 5 seconds (Q&A)
9. **Undo Window** - Must implement 5-second countdown timer (not indefinite undo)
10. **Apply Logic** - Must validate changes before applying (diff preview required)

### 🧪 Testing Standards

**Unit Tests (10+ test cases):**
- Test each AC with specific instruction patterns
- Test resource validation with missing templates/fields
- Test best practices detection (wait steps, personalization)
- Test rate limit warning calculation
- Test credit tracking and timeout enforcement

**Integration Tests:**
- Test API endpoint with various instruction patterns
- Test error handling (invalid workspace, agent, insufficient credits)
- Test JSON response format matches frontend expectations

**E2E Tests:**
- Manual verification of all 8 ACs
- Performance verification: <8 seconds for 90% of reviews
- Apply/undo functionality testing
- Resource validation warning display

### 🌐 Latest Technical Intelligence (2026)

**Gemini 2.5 Pro Updates (Analysis Tasks):**
- Use `thinking_level: "medium"` for instruction analysis (balanced depth/speed)
- Structured output with JSON schema enforcement
- Temperature: 0.3 for consistent, deterministic suggestions (lower than chat)
- Context window: 1 million tokens, Output limit: 64,000 tokens
- Rate limits: Free tier 5 RPM, Tier 1 paid 150-300 RPM

**Best Practices for Instruction Analysis:**
- Use few-shot examples in system prompt (show 2-3 example reviews)
- Separate trusted system knowledge from untrusted user instructions
- Request specific output format in system prompt (JSON schema)
- Include workspace context (templates, fields) to prevent false positives
- Parse output with Zod schema validation for type safety

**Frontend UX Patterns (2026):**
- Toast notifications with action buttons (shadcn/ui Sonner)
- Diff viewer with syntax highlighting (react-diff-viewer-continued)
- Countdown timers with visual feedback (Progress component)
- Modal dialogs with escape key handling (shadcn/ui Dialog)
- Smooth animations with Framer Motion (exit animations for dismissed items)

### 📊 Credit and Performance Configuration

**Credit Cost:**
- 2 credits per review (more complex than Q&A, less than generation)
- Pre-flight check: `await this.checkWorkspaceCredits(workspaceId, 2)`
- Post-completion: `this.deductCredits(workspaceId, 2).catch(...)`

**Timeout:**
- 8 seconds (same as workflow generation complexity)
- Use Promise.race pattern with timeout rejection

**Model Configuration:**
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro',
  generationConfig: {
    thinking_level: 'medium', // Analysis task (balanced)
    temperature: 0.3, // Consistent suggestions
    response_mime_type: 'application/json' // Force JSON output
  }
});
```

### 🔐 Security Requirements

**Workspace Isolation (CRITICAL):**
- Template validation: `EmailTemplate.find({ workspace: workspaceId })`
- Field validation: `CustomFieldDefinition.find({ workspace: workspaceId })`
- Agent access: Verify agent belongs to workspace before review
- Never expose cross-workspace resources in suggestions

**Prompt Injection Defense:**
- User instructions isolated from system prompt
- Marked as DATA input with security boundary
- No user input modifies review logic or criteria
- Example format:
  ```
  SYSTEM: [Review criteria and best practices]

  WORKSPACE CONTEXT: [Templates, fields, integrations]

  USER INSTRUCTIONS TO ANALYZE (DATA ONLY):
  ${userInstructions}
  ```

**Authentication:**
- All routes use `authenticate` middleware
- Validate user owns workspace
- Validate agent belongs to workspace
- Return 404 if access denied (don't reveal agent exists)

### 📚 Implementation Approach

**Phase 1: Backend Core**
1. Add `reviewInstructions()` method with Gemini structured output
2. Implement `buildReviewPrompt()` with best practices knowledge base
3. Add `validateTemplateReferences()` and `validateCustomFieldReferences()` helpers
4. Configure credit tracking (2 credits) and timeout (8s)
5. Add POST `/review` endpoint with JSON response

**Phase 2: Frontend UI**
1. Create ReviewSuggestionsPanel component with three sections
2. Implement useInstructionHistory hook for undo functionality
3. Add "Review Instructions" button to agent builder
4. Create diff preview modal for apply confirmation
5. Add resource validation warning displays

**Phase 3: Testing & Validation**
1. Write unit tests for review methods (10+ test cases)
2. Write integration tests for API endpoint
3. Manual E2E testing for all 8 ACs
4. Performance testing (<8s for 90% of reviews)

### Project Structure Notes

**Alignment with Unified Project Structure:**
- Backend services: `backend/src/services/AgentCopilotService.ts` (extend existing)
- Backend routes: `backend/src/routes/agentCopilot.ts` (add endpoint)
- Frontend components: `frontend/components/agents/copilot/ReviewSuggestionsPanel.tsx`
- Frontend hooks: `frontend/hooks/useInstructionHistory.ts`
- Tests: `backend/src/services/__tests__/AgentCopilotService.review.test.ts`

**No conflicts or variances detected** - Story 4.4 extends existing AgentCopilotService architecture without introducing new patterns.

### References

All technical details sourced from comprehensive artifact analysis:

**Epic Context:**
- [Source: _bmad-output/planning-artifacts/epics/epic-04-ai-powered-agent-building.md#Story-4.4]
- Story 4.4 acceptance criteria and technical requirements

**Architecture:**
- [Source: _bmad-output/planning-artifacts/architecture.md (Lines 1-500)]
- Tech stack, AI system architecture, database models, rate limits, best practices

**Previous Story Intelligence:**
- [Source: _bmad-output/implementation-artifacts/4-3-answer-questions-about-automation.md]
- Patterns: Workspace context loading, credit tracking, timeout handling, security
- [Source: backend/src/services/AgentCopilotService.ts]
- Lines 526-549: `_loadWorkspaceData()` method for template/field loading
- Lines 419-431: Credit tracking pattern
- Lines 208-305: Prompt building pattern with workspace context
- Lines 556-606: Custom field loading with graceful degradation

**Git Intelligence:**
- Commit 86098a6: "5-3 implemented" (integration expiration notifications, 10 files, 1,326 lines)
- Pattern: Comprehensive service methods, email templates, notification logic
- Recent work: NotificationService enhancements, TokenRefreshService integration checks

**Latest Technical Research (2026):**
- Gemini 2.5 Pro API with structured output (JSON schema enforcement)
- React Hook Form + Zod for frontend validation
- shadcn/ui components (Dialog, Toast, Badge, Card)
- Framer Motion for smooth animations

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
