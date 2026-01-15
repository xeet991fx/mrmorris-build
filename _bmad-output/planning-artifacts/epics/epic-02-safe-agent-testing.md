## Epic 2: Safe Agent Testing

Users can validate agents work correctly before going live using Test Mode (dry run).

### Story 2.1: Enable Test Mode

As a workspace owner,
I want to run my agent in Test Mode,
So that I can see what it will do without executing real actions.

**Acceptance Criteria:**

**Given** I have an agent with instructions configured
**When** I click the "Test Mode" button in the agent builder
**Then** A Test Mode panel opens on the right side of the screen
**And** I see a "Run Test" button
**And** I see a message: "Test Mode simulates execution without performing real actions"

**Given** I click "Run Test" in Test Mode
**When** The test executes
**Then** The agent instructions are parsed by InstructionParserService
**And** Each step is simulated without actually executing actions
**And** No emails are sent, no LinkedIn messages are sent, no data is modified
**And** The test completes and shows results

**Given** An agent instruction says "Send email to contact"
**When** I run Test Mode
**Then** The result shows: "✅ Would send email to [contact name] (DRY RUN)"
**And** No actual email is sent
**And** The email content preview is displayed

**Given** An agent instruction includes "Update deal value to $50,000"
**When** I run Test Mode
**Then** The result shows: "✅ Would update deal value to $50,000 (DRY RUN)"
**And** The actual deal value in the database is not changed

**Given** Test Mode encounters an error in instructions
**When** The test runs
**Then** The error is displayed: "⚠️ Error at Step 3: Invalid email template 'xyz' - template not found"
**And** The test stops at the error point
**And** I can fix the instructions and re-test

**Technical Requirements:**
- Create TestModeService that simulates execution
- Parse instructions using InstructionParserService
- Execute each action in dry-run mode (no side effects)
- Return detailed results with step-by-step breakdown
- Frontend: Test Mode panel UI component
- Frontend: "Run Test" button that calls POST `/api/workspaces/:workspaceId/agents/:agentId/test`

---

### Story 2.2: Select Test Target

As a workspace owner,
I want to select a specific contact or deal to test my agent against,
So that I can see realistic results based on actual data.

**Acceptance Criteria:**

**Given** I open Test Mode for an agent
**When** The Test Mode panel displays
**Then** I see a dropdown to "Select test target"
**And** I can choose between: Contact, Deal, or No target (manual input)

**Given** I select "Contact" as test target
**When** The dropdown expands
**Then** I see a searchable list of contacts from my workspace
**And** I can search by name, email, or company
**And** I can select a contact from the list

**Given** I select contact "John Doe" as test target
**When** I run the test
**Then** The test uses John Doe's actual data (email, title, company, custom fields)
**And** Instructions referencing @contact.firstName resolve to "John"
**And** Instructions referencing @contact.company resolve to John's company

**Given** I select "Deal" as test target
**When** The dropdown expands
**Then** I see a searchable list of deals from my workspace
**And** I can search by deal name, company, or value
**And** I can select a deal from the list

**Given** I select deal "Acme Corp - $50K" as test target
**When** I run the test
**Then** The test uses the deal's actual data (value, stage, company, contact)
**And** Instructions referencing @deal.value resolve to 50000
**And** Instructions referencing @deal.company resolve to "Acme Corp"

**Given** I select "No target" (manual input)
**When** I run the test
**Then** I can manually enter test data for variables
**And** The test uses my manually entered data instead of real records

**Given** An agent has trigger "Contact Created"
**When** I open Test Mode
**Then** The test target defaults to "Contact" type
**And** I must select a contact to test against

**Technical Requirements:**
- Add testTarget parameter to test endpoint: { type: 'contact' | 'deal' | 'none', id?: string }
- Frontend: Test target selector with searchable dropdown
- Backend: Fetch actual contact/deal data and inject into test context
- Variable resolution: Replace @contact.*, @deal.* with actual values from selected target
- Validation: Require test target selection if agent references contact/deal variables

---

### Story 2.3: Step-by-Step Execution Preview

As a workspace owner,
I want to see a detailed step-by-step breakdown of what my agent will do,
So that I can verify the logic before going live.

**Acceptance Criteria:**

**Given** I run a test with selected target
**When** The test executes
**Then** I see each step displayed sequentially with status icon
**And** Each step shows: Step number, action type, parameters, result

**Given** An agent has instruction: "Find contacts where title contains 'CEO'"
**When** Test Mode executes
**Then** Step 1 shows: "🔍 Search Contacts: title contains 'CEO'"
**And** Result shows: "Found 5 contacts matching criteria"
**And** I see a preview of the matched contacts (name, title, company)

**Given** An agent has instruction: "Send email using template 'Outbound v2'"
**When** Test Mode reaches this step
**Then** Step 2 shows: "📧 Send Email (DRY RUN)"
**And** Result shows: "Would send email to: john@acme.com"
**And** I see the email subject preview
**And** I see the email body preview with variables resolved
**And** A badge says "DRY RUN - Not actually sent"

**Given** An agent has instruction: "Wait 5 days"
**When** Test Mode reaches this step
**Then** Step 3 shows: "⏰ Wait 5 days (SIMULATED)"
**And** Result shows: "Execution would pause for 5 days, then resume"

**Given** An agent has conditional logic: "If contact replied, send thank you email"
**When** Test Mode executes
**Then** Step 4 shows: "🔀 Conditional: If contact.replied == true"
**And** Result shows: "Condition evaluated to FALSE (contact has not replied)"
**And** Step 5 (thank you email) is skipped with note: "Skipped due to condition"

**Given** Test execution encounters an error
**When** Step 3 fails (e.g., invalid template)
**Then** Step 3 shows: "❌ Error: Email template 'xyz' not found"
**And** Subsequent steps are marked as "Not executed"
**And** I see suggestions: "Create template 'xyz' or update instruction"

**Given** Test completes successfully
**When** All steps finish
**Then** I see a summary: "✅ Test completed: 5 steps, 0 errors, 0 warnings"
**And** Each step can be expanded to see full details

**Technical Requirements:**
- TestModeService returns structured step array: [{ stepNumber, action, params, result, status, preview }]
- Frontend: Step-by-step accordion or list view
- Frontend: Step status icons (✅ success, ⚠️ warning, ❌ error, ⏭️ skipped)
- Frontend: Expandable step details with full preview content
- Backend: Resolve all variables and show actual values in preview
- Backend: Evaluate conditions and mark skipped steps

---

### Story 2.4: Validate Instructions

As a workspace owner,
I want to get warnings about potential errors in my instructions,
So that I can fix issues before going live.

**Acceptance Criteria:**

**Given** I have written agent instructions
**When** I click "Validate Instructions" or run Test Mode
**Then** The system validates instructions for common errors
**And** I see warnings or errors highlighted

**Given** My instructions reference a non-existent email template
**When** Validation runs
**Then** I see warning: "⚠️ Email template 'Outbound v2' not found. Create template or update instruction."
**And** The warning includes the line number where the issue occurs

**Given** My instructions use a variable that doesn't exist
**When** Validation runs
**Then** I see error: "❌ Variable @contact.customField1 not defined. Add custom field or check spelling."
**And** The instruction is highlighted

**Given** My instructions have conditional logic with syntax errors
**When** Validation runs
**Then** I see error: "❌ Invalid condition syntax: 'if contact.replied = true' (use == for comparison)"
**And** I see a suggestion: "Did you mean: 'if contact.replied == true'?"

**Given** My instructions reference an integration not connected
**When** Validation runs
**Then** I see warning: "⚠️ LinkedIn integration not connected. Connect integration before going live."

**Given** My instructions exceed rate limits
**When** Validation runs
**Then** I see warning: "⚠️ This agent may send 200 emails/day, exceeding limit of 100. Consider reducing scope or increasing limit."

**Given** All instructions are valid
**When** Validation runs
**Then** I see success message: "✅ Instructions validated successfully. No errors found."

**Given** I have validation warnings but no errors
**When** I try to go Live
**Then** I see a confirmation: "Agent has 2 warnings. Review warnings before going live."
**And** I can choose to continue or fix warnings first

**Technical Requirements:**
- Create InstructionValidationService
- Validation checks:
  - Template existence
  - Variable definitions
  - Conditional syntax
  - Integration availability
  - Rate limit estimates
  - Action parameter validity
- Return warnings and errors with line numbers
- Frontend: Inline validation display in instructions editor
- Frontend: Validation summary modal
- Allow going Live with warnings (not errors)

---

### Story 2.5: Show Execution Estimates

As a workspace owner,
I want to see estimated execution time and AI credit cost for my test,
So that I can understand the resource requirements before going live.

**Acceptance Criteria:**

**Given** I run a test in Test Mode
**When** The test completes
**Then** I see execution time estimate: "Estimated execution time: 12 seconds"
**And** I see AI credit cost estimate: "Estimated cost: 3 AI credits"

**Given** An agent has simple instructions (no AI parsing required)
**When** Test executes
**Then** Estimated time: < 5 seconds
**And** Estimated cost: 0 credits (no AI operations)

**Given** An agent uses AI Copilot-generated content
**When** Test executes
**Then** Estimated cost includes: Instruction parsing (2 credits) + variable resolution (1 credit) = 3 credits

**Given** An agent has "Wait 5 days" instruction
**When** Test executes
**Then** Estimated time shows: "12 seconds active + 5 days wait time"
**And** Wait time is clearly distinguished from active execution time

**Given** An agent has multiple conditional branches
**When** Test executes
**Then** Estimated time shows worst-case scenario: "15-30 seconds (depends on conditions)"

**Given** An agent sends 50 emails
**When** Test executes
**Then** Estimated time: "~25 seconds (50 emails × 0.5s per email)"
**And** Estimated cost: "5 credits (instruction parsing + email personalization)"

**Given** Test Mode runs multiple times
**When** I run the same test again
**Then** The estimates remain consistent
**And** I see: "Previous test: 12s / 3 credits"

**Given** I have a scheduled agent
**When** I view execution estimates
**Then** I see daily/monthly projections: "Running daily: ~90 credits/month"

**Technical Requirements:**
- TestModeService calculates execution time per step
- Sum all step durations for total estimate
- Calculate AI credit cost based on:
  - Instruction parsing: 2 credits
  - AI-generated content: 1-3 credits per generation
  - Web search: 1 credit per search
- Frontend: Display estimates prominently in test results
- Frontend: Show breakdown: "Parsing (2) + Actions (1) = 3 credits"
- Store estimates with test results for comparison

---

### Story 2.6: Test Result Performance

As a workspace owner,
I want test results returned quickly,
So that I can iterate rapidly during agent development.

**Acceptance Criteria:**

**Given** I run a test with simple instructions
**When** The test executes
**Then** Results are returned in < 5 seconds
**And** I see a loading indicator during execution

**Given** I run a test with complex multi-step instructions
**When** The test executes
**Then** Results are returned in < 10 seconds for 80% of tests (NFR2)
**And** Each step result streams as it completes (progressive display)

**Given** A test takes longer than expected
**When** Execution time exceeds 10 seconds
**Then** I see a progress message: "Test is taking longer than usual... Step 5 of 8 completed"
**And** I see an option to "Cancel Test"

**Given** Test Mode queries large datasets
**When** Instructions include "Find all contacts"
**Then** The query is limited to 100 records for testing
**And** I see note: "Limited to 100 records in Test Mode (Live mode processes all)"

**Given** Test Mode includes Web Search action
**When** The search executes
**Then** Real web search is performed (not simulated)
**And** Results are returned within 5 seconds (NFR55)
**And** Search results are cached for 15 minutes

**Given** I run the same test multiple times
**When** Test executes
**Then** Subsequent runs use cached parsing results
**And** Second run completes in ~50% less time

**Given** Test Mode times out after 30 seconds
**When** Execution exceeds timeout
**Then** I see error: "Test timed out after 30 seconds. Simplify instructions or break into multiple agents."
**And** Partial results (completed steps) are still displayed

**Technical Requirements:**
- Set test execution timeout: 30 seconds
- Optimize TestModeService for performance:
  - Limit database queries (max 100 records)
  - Cache instruction parsing results (15 min TTL)
  - Parallel step execution where possible
- Frontend: Progressive result streaming (display steps as they complete)
- Frontend: Loading state with progress indicator
- Frontend: Cancel button for long-running tests
- Monitor performance: Log test duration, alert if >10s consistently

---

### Story 2.7: Compare Test vs Live Results

As a workspace owner,
I want to verify that Test Mode predictions match actual live execution,
So that I can trust the test results.

**Acceptance Criteria:**

**Given** I run a test, then run the same agent live
**When** Both executions complete
**Then** I can compare test vs live results side-by-side

**Given** Test Mode predicted "Would send email to john@acme.com"
**When** The agent runs live
**Then** Email is actually sent to john@acme.com
**And** The test prediction was accurate (matches live result)

**Given** Test Mode predicted "Would update 5 contacts"
**When** The agent runs live
**Then** Exactly 5 contacts are updated
**And** Test prediction matches live result

**Given** Test Mode showed conditional logic skipping Step 4
**When** The agent runs live with same conditions
**Then** Step 4 is skipped in live execution too
**And** Condition evaluation is consistent

**Given** Test Mode and live execution have different results
**When** A mismatch is detected (e.g., test said 5 contacts, live found 3)
**Then** I see a warning: "⚠️ Test vs Live mismatch detected"
**And** I see details: "Test predicted 5 contacts, but 3 were found in live execution"
**And** I see possible reasons: "Data may have changed between test and live run"

**Given** I run multiple tests and live executions
**When** Comparing results over time
**Then** System tracks accuracy: "Test predictions match live results 95% of time" (NFR36)
**And** Accuracy metric is displayed in agent dashboard

**Given** A test uses stale data
**When** Contact data changed after test but before live run
**Then** Live execution uses current data (not test snapshot)
**And** I see note: "Live execution uses real-time data, which may differ from test"

**Given** Test Mode has prediction errors
**When** Accuracy drops below 90%
**Then** System alert: "Test Mode accuracy degraded. Review instruction parsing service."

**Technical Requirements:**
- Store test results with testRunId
- Store live execution results with reference to prior testRunId (if available)
- Create comparison endpoint: GET `/api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/compare-to-test`
- Calculate accuracy metric: (matching results / total executions) × 100
- Frontend: Test vs Live comparison view
- Frontend: Accuracy metric badge on agent card
- Backend: Track and log prediction mismatches for analysis

---

**Epic 2 Summary:**
- 7 stories created
- All FRs covered (FR35-FR41)
- Complete acceptance criteria for each story
- No future dependencies (each story builds on previous)
- Stories appropriately sized for single dev completion
- NFRs addressed (NFR2: <10s test results, NFR36: 95% accuracy)
