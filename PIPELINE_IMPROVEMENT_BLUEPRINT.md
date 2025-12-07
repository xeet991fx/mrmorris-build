# Copper-Quality Pipeline CRM Implementation Blueprint

## Executive Summary
Transform the current pipeline from basic kanban to a Copper-quality CRM with AI superpowers. Implementation timeline: 1 week.

---

## Current State Analysis

### What You Have ✅
- Working kanban board with drag-and-drop (DnD Kit)
- Pipeline & stage management
- Opportunity CRUD operations
- Basic card display (title, value, priority, assignee, due date)
- Contact & company linking (IDs stored)
- Stage history tracking with timestamps
- Table view with filtering
- Zustand state management
- MongoDB data models with AI insights placeholder

### What's Missing ❌
- Contact/company data NOT displayed on cards (only IDs stored)
- No contact photos
- No "days in stage" calculation
- No last activity tracking
- No next action field
- No activity timeline
- No email/call logging
- No file attachments
- No deal temperature (hot/warm/cold)
- No hover actions menu
- AI features are placeholders only

---

## Part 1: Copper-Quality Opportunity Cards

### 1.1 Card Layout Design

**Visual Hierarchy (Top to Bottom):**

```
┌─────────────────────────────────────────────┐
│ 🔥 $25,000 USD                    [•••]     │ ← Temperature + Value + Menu
├─────────────────────────────────────────────┤
│ 👤 John Smith                               │ ← Contact photo + name
│    Acme Corp                                │ ← Company name
├─────────────────────────────────────────────┤
│ Enterprise Software License Renewal         │ ← Deal title
├─────────────────────────────────────────────┤
│ 📅 3 days in stage    🕐 Last: 2h ago       │ ← Stage time + Activity
│ ⚡ Next: Follow-up call scheduled           │ ← Next action
├─────────────────────────────────────────────┤
│ 📎 3 files  💬 5 notes  📞 Last call: Mon   │ ← Quick stats
└─────────────────────────────────────────────┘
```

**Component Breakdown:**

**Header Row:**
- Temperature indicator: 🔥 Hot / 🌡️ Warm / ❄️ Cold (based on activity + AI score)
- Deal value: LARGE, bold, lime green (#84cc16)
- Three-dot menu (always visible on hover)

**Contact Section:**
- Round avatar (40x40px) with photo or initials fallback
- Contact name (bold, 16px)
- Company name (gray, 14px)

**Title Section:**
- Deal title (16px, 2-line truncation with tooltip)

**Metrics Row:**
- Days in stage (calculated from stageHistory)
- Last activity timestamp (relative time: "2h ago", "3 days ago")

**Action Row:**
- Next action text with icon
- Conditionally rendered based on nextAction field

**Footer Stats:**
- File count badge
- Note count badge
- Last communication indicator

---

### 1.2 Hover Actions vs Click-to-Open

**Strategy: Hybrid Approach**

**Hover Actions (Quick Menu):**
- Three-dot menu appears on card hover (top-right)
- Actions:
  - ✏️ Quick Edit (inline edit mode or side panel)
  - 📧 Log Email
  - 📞 Log Call
  - 📎 Add File
  - 🗑️ Delete
  - 👁️ View Full Details

**Click-to-Open (Primary Action):**
- Clicking anywhere on card EXCEPT menu → Opens detailed side panel
- Side panel shows:
  - Full opportunity details (all fields)
  - Activity timeline (scrollable)
  - Email/call history
  - File attachments
  - Edit form (collapsible sections)
  - Related contacts/companies
  - AI insights section

**Why This Works:**
- Quick actions accessible without modal
- Card click gives full context
- Doesn't interfere with drag-and-drop
- Matches modern CRM UX (HubSpot, Pipedrive, Copper)

---

### 1.3 Drag-Drop Behavior Enhancement

**Current:** Card moves, stage updates, stage history logged

**Enhanced Behavior:**

**On Drag Start:**
- Card lifts with shadow effect
- Target stages highlight with subtle glow
- Other cards fade to 80% opacity
- Show estimated win rate change indicator

**During Drag:**
- Column highlights when card hovers over it
- Show preview position between cards
- Display stage probability if configured

**On Drop:**
1. Optimistic UI update (immediate visual move)
2. Show confirmation toast: "Moved to [Stage Name]"
3. Background API call to update stage
4. **Auto-create activity log entry:**
   - Type: "Stage Change"
   - Description: "Moved from [Old Stage] to [New Stage]"
   - Timestamp: current time
   - Auto-link to opportunity
5. Update stageHistory with:
   - Previous stage exit time
   - New stage entry time
   - Duration in previous stage (milliseconds)
6. Trigger AI re-analysis if moving to final stages

**Error Handling:**
- If API fails, revert card to original position
- Show error toast: "Failed to move. Try again."
- Log error for debugging

**Stage-Specific Actions:**
- If moved to "Won": Auto-set actualCloseDate, status="won", prompt for win notes
- If moved to "Lost": Show modal asking for lostReason, status="lost"
- If moved backward: Flag for manager review (optional feature)

---

### 1.4 Deal Value Display

**Primary Display (Card Header):**
- Font: 20px bold
- Color: Lime green (#84cc16) for positive values
- Format: `$25,000 USD` or `€15K` (compact for >$10K)
- Position: Top-left, immediately after temperature icon

**Secondary Indicators:**
- Weighted value: `(value × probability)` shown in tooltip
- Change indicator: If value updated recently, show ↑/↓ arrow
- Stage average: Show on column header "Avg: $18K"

**Compact Mode (for smaller cards):**
- If card height < 200px: Use `$25K` format
- Hide currency if all deals in workspace use same currency

**Accessibility:**
- Use `aria-label` for screen readers
- Ensure sufficient contrast (4.5:1 ratio)

---

## Part 2: Activity Timeline & Communication Logging

### 2.1 Activity Timeline Format

**New Data Model: Activity**

```typescript
interface IActivity {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId; // who performed the action
  opportunityId: ObjectId;

  type: "email" | "call" | "meeting" | "note" | "stage_change" | "file_upload" | "task" | "ai_suggestion";

  title: string; // "Called John Smith"
  description?: string; // Call notes

  // Communication-specific
  direction?: "inbound" | "outbound"; // for emails/calls
  duration?: number; // for calls (seconds)
  emailSubject?: string;
  emailBody?: string; // store for AI analysis

  // Task-specific
  dueDate?: Date;
  completed?: boolean;

  // File-specific
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;

  // Metadata
  metadata?: {
    fromStage?: string;
    toStage?: string;
    oldValue?: any;
    newValue?: any;
  };

  // AI
  isAutoLogged?: boolean; // AI-generated
  aiConfidence?: number; // 0-100

  createdAt: Date;
}
```

**Timeline Component Structure:**

```tsx
<ActivityTimeline opportunityId={id}>
  {/* Group by date */}
  <DateGroup date="Today">
    <ActivityItem type="call" direction="outbound">
      <Avatar user={activityUser} />
      <Content>
        <Header>
          <strong>You</strong> called John Smith
          <Time>2 hours ago</Time>
        </Header>
        <Body>
          Discussed pricing for enterprise plan. Follow-up needed on security compliance questions.
        </Body>
        <Actions>
          <Button>Edit</Button>
          <Button>Delete</Button>
        </Actions>
      </Content>
      <Icon type="phone" />
    </ActivityItem>

    <ActivityItem type="email" direction="inbound" aiGenerated>
      <AiBadge>AI Logged</AiBadge>
      <Content>
        <Header>
          <strong>John Smith</strong> sent email
          <Time>5 hours ago</Time>
        </Header>
        <EmailPreview>
          <Subject>Re: Enterprise Pricing</Subject>
          <Snippet>Thanks for the call. Can you send over the security...</Snippet>
        </EmailPreview>
        <Actions>
          <Button>View Full Email</Button>
          <Button>Reply</Button>
        </Actions>
      </Content>
      <Icon type="email" />
    </ActivityItem>
  </DateGroup>

  <DateGroup date="Yesterday">
    <ActivityItem type="stage_change">
      <SystemIcon />
      <Content>
        Stage changed from "Proposal" to "Negotiation"
        <Time>Yesterday at 3:45 PM</Time>
      </Content>
    </ActivityItem>
  </DateGroup>
</ActivityTimeline>
```

**Timeline Features:**
- Real-time updates (websocket or polling)
- Infinite scroll for old activities
- Expandable email/note content
- Quick reply for emails (inline composer)
- Edit/delete for manual entries
- AI badge for auto-logged items
- Icon system for activity types

---

### 2.2 Email/Call Logging UI

**Quick Log (From Card Hover Menu):**

**Email Log Modal:**
```
┌─────────────────────────────────────┐
│ Log Email                     [×]   │
├─────────────────────────────────────┤
│ Direction: ◉ Sent  ○ Received       │
│                                     │
│ Subject:                            │
│ [Re: Enterprise Pricing        ]   │
│                                     │
│ Date & Time:                        │
│ [2024-01-15] [14:30]               │
│                                     │
│ Notes/Summary:                      │
│ ┌─────────────────────────────────┐ │
│ │ Discussed pricing, shared deck  │ │
│ │ Next: Schedule demo            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📎 Attach Email (optional)          │
│ [Upload .eml file or paste]        │
│                                     │
│ ☑️ Set as last activity             │
│ ☑️ Create follow-up task            │
│                                     │
│         [Cancel]  [Log Email]       │
└─────────────────────────────────────┘
```

**Call Log Modal:**
```
┌─────────────────────────────────────┐
│ Log Call                      [×]   │
├─────────────────────────────────────┤
│ Direction: ◉ Outbound  ○ Inbound    │
│                                     │
│ Contact:                            │
│ [John Smith (Acme Corp)        ▼]  │
│                                     │
│ Duration: [15] minutes              │
│                                     │
│ Outcome:                            │
│ ◉ Connected  ○ Voicemail  ○ No Ans │
│                                     │
│ Call Notes:                         │
│ ┌─────────────────────────────────┐ │
│ │ • Discussed Q4 budget           │ │
│ │ • Needs approval from CFO      │ │
│ │ • Follow-up in 2 weeks         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Next Action:                        │
│ [Send proposal to CFO          ]   │
│ Due: [2024-01-29]                  │
│                                     │
│ ☑️ Set as last activity             │
│ ☑️ Update deal probability          │
│                                     │
│         [Cancel]  [Log Call]        │
└─────────────────────────────────────┘
```

**Features:**
- Pre-filled contact from opportunity
- Auto-update lastActivityAt timestamp
- Optional next action creation
- Voice-to-text transcription (future: AI integration)
- Link recording file (future feature)

---

### 2.3 File Attachment Handling

**Data Model Update:**

```typescript
interface IAttachment {
  _id: ObjectId;
  workspaceId: ObjectId;
  opportunityId: ObjectId;
  userId: ObjectId; // uploader

  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // bytes
  fileUrl: string; // S3/cloud storage URL

  // Metadata
  uploadedAt: Date;
  category?: "proposal" | "contract" | "presentation" | "other";
  description?: string;

  // AI
  aiExtractedText?: string; // for searchability
  aiSummary?: string;
}
```

**Upload UI (Drag & Drop + Button):**

```tsx
<FileAttachmentZone>
  {/* Drag-drop zone */}
  <DropZone onDrop={handleFiles}>
    <Icon>📎</Icon>
    <Text>Drag files here or</Text>
    <Button variant="link">Browse</Button>
    <Limit>Max 25MB per file</Limit>
  </DropZone>

  {/* Uploaded files list */}
  <FileList>
    {attachments.map(file => (
      <FileItem key={file._id}>
        <FileIcon type={file.fileType} />
        <FileInfo>
          <FileName>{file.fileName}</FileName>
          <FileMeta>
            {formatFileSize(file.fileSize)} •
            Uploaded by {file.user.name} •
            {formatDate(file.uploadedAt)}
          </FileMeta>
        </FileInfo>
        <FileActions>
          <Button onClick={download}>Download</Button>
          <Button onClick={preview}>Preview</Button>
          <Button onClick={remove}>Delete</Button>
        </FileActions>
      </FileItem>
    ))}
  </FileList>
</FileAttachmentZone>
```

**Storage Strategy:**
1. **Development:** Store in local `uploads/` directory
2. **Production:** Use AWS S3 or Cloudflare R2
3. Implement signed URLs for security
4. Virus scanning on upload
5. Thumbnail generation for images/PDFs

**Card Display:**
- Show attachment count badge: "📎 3 files"
- Tooltip on hover shows file names
- Click badge to expand file list in side panel

---

### 2.4 Status Indicators (Deal Temperature)

**Temperature Logic:**

```typescript
function calculateDealTemperature(opportunity: IOpportunity, activities: IActivity[]): "hot" | "warm" | "cold" {
  const factors = {
    daysSinceLastActivity: getDaysSince(opportunity.lastActivityAt),
    probability: opportunity.probability || 50,
    daysInStage: calculateDaysInStage(opportunity),
    activityCount30Days: activities.filter(a => isLast30Days(a.createdAt)).length,
    emailResponsiveness: calculateEmailResponseTime(activities),
    dealValue: opportunity.value,
    aiDealScore: opportunity.aiInsights?.dealScore || 50
  };

  // Hot criteria (any of):
  if (
    factors.daysSinceLastActivity <= 2 ||
    (factors.probability >= 70 && factors.activityCount30Days >= 5) ||
    factors.aiDealScore >= 80
  ) {
    return "hot";
  }

  // Cold criteria (any of):
  if (
    factors.daysSinceLastActivity > 14 ||
    (factors.probability < 30 && factors.daysInStage > 30) ||
    factors.activityCount30Days === 0 ||
    factors.aiDealScore < 30
  ) {
    return "cold";
  }

  // Default: warm
  return "warm";
}
```

**Visual Indicators:**

| Temperature | Icon | Color | Card Border | Meaning |
|-------------|------|-------|-------------|---------|
| Hot 🔥 | 🔥 | Red (#ef4444) | 2px solid red | Active, high chance, recent activity |
| Warm 🌡️ | 🌡️ | Yellow (#eab308) | 1px solid yellow | Moderate activity, progressing |
| Cold ❄️ | ❄️ | Blue (#3b82f6) | 1px dashed blue | Stale, needs attention, low activity |

**Card Display:**
- Icon in top-left corner (before deal value)
- Subtle glow effect matching color
- Tooltip explaining why: "Hot: 5 activities this week, 85% probability"

**Filtering:**
- Add filter buttons: "Show Hot Deals Only"
- Sort by temperature
- Dashboard widget: "X Hot Deals Need Attention"

---

## Part 3: AI Superpowers (Beyond Copper)

### 3.1 Auto-Log Emails as Activities

**Feature: Email Integration + AI Parsing**

**Architecture:**

```
Email Provider (Gmail/Outlook)
  ↓ (webhook/polling)
Backend Email Ingestion Service
  ↓ (parse + match)
AI Email Analyzer (Claude API)
  ↓ (extract metadata)
Auto-Create Activity + Link to Opportunity
```

**Implementation Steps:**

1. **Email Ingestion:**
   - Integrate with Gmail API (OAuth2)
   - Set up webhook for new emails
   - Alternatively: IMAP polling every 5 minutes

2. **Email Matching:**
   - Extract sender email address
   - Match against contacts in workspace
   - If contact linked to opportunity → auto-log

3. **AI Analysis (Claude API):**
   - Send email subject + body to Claude
   - Prompt: "Extract key information from this sales email..."
   - Claude returns:
     - Summary (1-2 sentences)
     - Sentiment (positive/neutral/negative)
     - Action items mentioned
     - Urgency level
     - Deal value changes mentioned
     - Next steps

4. **Auto-Create Activity:**
   - Type: "email"
   - Direction: inbound/outbound (based on sender)
   - Title: Email subject
   - Description: AI-generated summary
   - metadata: { aiGenerated: true, confidence: 95 }
   - Update lastActivityAt

5. **User Confirmation:**
   - Show notification: "New email auto-logged for [Deal Name]"
   - Allow edit/delete if incorrect
   - Learn from user corrections (future: improve matching)

**Configuration:**
- Per-workspace toggle: "Auto-log emails"
- Whitelist/blacklist email addresses
- Set confidence threshold (default: 80%)

---

### 3.2 Predict Close Probability

**Feature: AI Deal Scoring**

**Input Data for AI Model:**
- Days in pipeline
- Days in current stage
- Stage position (early vs late)
- Activity frequency (emails, calls, meetings)
- Email sentiment analysis
- Response time from prospect
- Deal value relative to average
- Contact seniority (if available)
- Company size/industry
- Historical win rates for similar deals
- Competitor mentions in communications

**AI Implementation (Two Approaches):**

**Approach A: Claude API Real-Time Analysis**
```typescript
async function analyzeOpportunityWithClaude(opportunity: IOpportunity, activities: IActivity[]) {
  const prompt = `
    You are a sales AI analyzing deal probability. Based on the following data, provide:
    1. Close probability (0-100)
    2. Key risk factors (3-5 bullet points)
    3. Recommended next actions (3-5 bullet points)
    4. Deal score explanation

    Deal Details:
    - Title: ${opportunity.title}
    - Value: ${opportunity.value}
    - Stage: ${opportunity.stageName} (${opportunity.daysInStage} days)
    - Total age: ${opportunity.totalDays} days
    - Activities last 30 days: ${activities.length}
    - Last activity: ${opportunity.lastActivityAt}
    - Current probability: ${opportunity.probability}%

    Recent Activities:
    ${activities.slice(0, 10).map(a => `- ${a.type}: ${a.title} (${a.createdAt})`).join('\n')}

    Email Sentiment: ${calculateSentiment(activities)}
    Response Time Avg: ${calculateAvgResponseTime(activities)} hours
  `;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }]
  });

  return parseAIResponse(response);
}
```

**Approach B: Train Custom Model (Future)**
- Collect historical deal data
- Features: all factors above
- Label: won/lost
- Train scikit-learn or TensorFlow model
- Deploy as microservice
- Update probability weekly

**Display on Card:**
- Show AI-calculated probability badge
- Color-coded: Green (>70%), Yellow (40-70%), Red (<40%)
- Tooltip: "AI Score: 78% (High activity, strong engagement)"
- Update automatically on new activities

**User Override:**
- Allow manual probability adjustment
- Show both: "AI: 78% | Manual: 85%"
- Track which is more accurate over time

---

### 3.3 Suggest Next Actions

**Feature: AI Action Recommendations**

**When to Trigger:**
- On page load (for all visible opportunities)
- After logging activity
- Daily digest email
- When deal goes "cold"

**AI Prompt Template:**
```typescript
const prompt = `
Based on this sales opportunity, suggest 3 specific next actions the sales rep should take.

Opportunity: ${opportunity.title}
Stage: ${opportunity.stageName}
Days in stage: ${daysInStage}
Last activity: ${lastActivity.type} ${timeAgo} ago
Deal value: ${opportunity.value}
Probability: ${opportunity.probability}%

Recent conversation topics (from emails/calls):
${extractTopics(activities)}

Current next action: ${opportunity.nextAction || "None set"}

Provide 3 actionable suggestions prioritized by impact. Format:
1. [Action] - [Reason] - [Urgency: High/Medium/Low]
`;
```

**Example AI Response:**
```
1. Schedule demo with CFO - Deal is in negotiation but no executive engagement yet - High
2. Send ROI calculator based on their company size - Prospect asked about pricing justification - High
3. Share case study from similar industry - Build credibility and address unspoken concerns - Medium
```

**Display:**
- Card footer: "⚡ Next: [Top suggestion]"
- Side panel: Full list of 3 suggestions
- One-click action: "Set as Next Action" button
- Mark as done when completed

**Smart Features:**
- Context-aware (considers last activities)
- Learns from user acceptance (track which suggestions are used)
- Integrates with calendar (suggest meeting times)
- Tracks effectiveness (which suggestions lead to stage progression)

---

### 3.4 Auto-Fill Missing Data

**Feature: AI Data Enrichment**

**What to Auto-Fill:**

1. **Contact Information:**
   - Photo (from email avatar or Clearbit API)
   - Job title (from email signature)
   - LinkedIn profile
   - Phone number (from signature)

2. **Company Information:**
   - Company logo
   - Industry
   - Employee count
   - Revenue range
   - Location

3. **Deal Fields:**
   - Expected close date (based on sales cycle length)
   - Deal source (inferred from first email)
   - Tags (auto-generated from email content)
   - Priority (based on deal value + activity)

**Implementation:**

**Step 1: Email Signature Parsing**
```typescript
async function parseEmailSignature(emailBody: string) {
  const prompt = `Extract contact information from this email signature:

  ${emailBody}

  Return JSON with: name, title, company, phone, email, linkedin`;

  const response = await callClaude(prompt);
  return JSON.parse(response);
}
```

**Step 2: Company Enrichment (External APIs)**
- Clearbit Enrichment API
- Hunter.io for email verification
- LinkedIn Sales Navigator API (if available)
- Free alternatives: OpenCorporates, Companies House

**Step 3: AI Field Suggestions**
```typescript
async function suggestMissingFields(opportunity: IOpportunity, activities: IActivity[]) {
  const missingFields = findMissingFields(opportunity);

  if (missingFields.includes('expectedCloseDate')) {
    // Calculate based on average sales cycle
    const avgCycle = await getAverageSalesCycle(opportunity.pipelineId);
    const suggested = addDays(opportunity.createdAt, avgCycle);

    return {
      field: 'expectedCloseDate',
      suggestedValue: suggested,
      confidence: 75,
      reason: `Based on ${avgCycle}-day average sales cycle`
    };
  }

  // More field suggestions...
}
```

**User Experience:**
- Show badge: "3 fields can be auto-filled"
- Click to review suggestions
- Accept all or cherry-pick
- Track accuracy for future improvements

---

## Part 4: Implementation Roadmap (1 Week)

### Day 1-2: Enhanced Opportunity Cards
- Update OpportunityCard component with new layout
- Add contact photo fetching and display
- Implement company name display (fetch from companyId)
- Add deal temperature calculation function
- Implement "days in stage" calculation
- Add last activity timestamp display
- Create nextAction field in schema and forms

**Files to Modify:**
- `frontend/components/pipelines/OpportunityCard.tsx`
- `backend/src/models/Opportunity.ts`
- `frontend/lib/api/contact.ts` (add fetch by ID)
- `frontend/lib/api/company.ts` (add fetch by ID)

### Day 3: Activity Timeline & Logging
- Create Activity mongoose model
- Build activity API endpoints (CRUD)
- Create ActivityTimeline component
- Build email logging modal
- Build call logging modal
- Integrate activity creation on stage changes

**New Files:**
- `backend/src/models/Activity.ts`
- `backend/src/routes/activity.ts`
- `frontend/components/activities/ActivityTimeline.tsx`
- `frontend/components/activities/LogEmailModal.tsx`
- `frontend/components/activities/LogCallModal.tsx`
- `frontend/lib/api/activity.ts`

### Day 4: File Attachments
- Create Attachment mongoose model
- Set up file upload endpoint (multer middleware)
- Configure local storage (or S3)
- Build file upload component
- Add file list display to opportunity details
- Update opportunity card to show file count

**New Files:**
- `backend/src/models/Attachment.ts`
- `backend/src/routes/attachment.ts`
- `backend/src/middleware/upload.ts`
- `frontend/components/attachments/FileUploadZone.tsx`
- `frontend/components/attachments/FileList.tsx`

### Day 5: Opportunity Detail Panel
- Create slide-over panel component
- Integrate all sections (details, timeline, files)
- Add quick edit functionality
- Implement panel navigation (prev/next opportunity)
- Add keyboard shortcuts (Esc to close)

**New Files:**
- `frontend/components/pipelines/OpportunityDetailPanel.tsx`
- `frontend/components/pipelines/OpportunityDetailHeader.tsx`
- `frontend/components/pipelines/OpportunityDetailTabs.tsx`

### Day 6-7: AI Features
- Integrate Claude API (backend service)
- Implement deal scoring algorithm
- Build next action suggestion engine
- Create email auto-logging webhook
- Add AI insights display to cards
- Build AI enrichment suggestions UI

**New Files:**
- `backend/src/services/ai.service.ts`
- `backend/src/services/email-ingestion.service.ts`
- `backend/src/utils/deal-scoring.ts`
- `frontend/components/ai/AIInsightsPanel.tsx`
- `frontend/components/ai/NextActionSuggestions.tsx`
- `frontend/components/ai/EnrichmentSuggestions.tsx`

---

## Part 5: Technical Implementation Details

### 5.1 Database Schema Updates

**Opportunity Model - Add Fields:**
```typescript
{
  // New fields
  nextAction?: string; // "Follow-up call scheduled for Friday"
  nextActionDueDate?: Date;
  dealTemperature?: "hot" | "warm" | "cold"; // cached, recalculated on activity

  // Enhanced AI insights
  aiInsights: {
    dealScore: number; // 0-100
    closeprobability: number; // AI-calculated, different from manual probability
    recommendedActions: string[];
    riskFactors: string[];
    lastAnalyzedAt: Date;
    confidenceLevel: number; // 0-100
  };

  // Activity tracking
  lastActivityAt: Date; // updated on any activity
  lastActivityType?: string; // "email" | "call" | "meeting"
  activityCount: number; // total activities
  activitiesLast30Days: number; // rolling count
}
```

**Add Indexes:**
```typescript
// Opportunity
opportunitySchema.index({ workspaceId: 1, lastActivityAt: -1 });
opportunitySchema.index({ workspaceId: 1, dealTemperature: 1 });
opportunitySchema.index({ workspaceId: 1, 'aiInsights.dealScore': -1 });

// Activity
activitySchema.index({ workspaceId: 1, opportunityId: 1, createdAt: -1 });
activitySchema.index({ workspaceId: 1, type: 1, createdAt: -1 });
```

---

### 5.2 API Endpoints to Add

**Activities:**
```
POST   /api/workspaces/:workspaceId/opportunities/:oppId/activities
GET    /api/workspaces/:workspaceId/opportunities/:oppId/activities (paginated)
GET    /api/workspaces/:workspaceId/activities/:id
PATCH  /api/workspaces/:workspaceId/activities/:id
DELETE /api/workspaces/:workspaceId/activities/:id
```

**Attachments:**
```
POST   /api/workspaces/:workspaceId/opportunities/:oppId/attachments (multipart)
GET    /api/workspaces/:workspaceId/opportunities/:oppId/attachments
DELETE /api/workspaces/:workspaceId/attachments/:id
GET    /api/workspaces/:workspaceId/attachments/:id/download (signed URL)
```

**AI Features:**
```
POST   /api/workspaces/:workspaceId/opportunities/:oppId/analyze (trigger AI analysis)
GET    /api/workspaces/:workspaceId/opportunities/:oppId/suggestions (get next actions)
POST   /api/workspaces/:workspaceId/opportunities/:oppId/enrich (auto-fill data)
POST   /api/workspaces/:workspaceId/emails/ingest (webhook for email ingestion)
```

---

### 5.3 Frontend Component Structure

```
components/
├── pipelines/
│   ├── OpportunityCard.tsx (ENHANCED)
│   │   ├── CardHeader (temperature + value + menu)
│   │   ├── ContactSection (photo + name + company)
│   │   ├── CardMetrics (days in stage + last activity)
│   │   └── CardFooter (stats + next action)
│   │
│   ├── OpportunityDetailPanel.tsx (NEW - slide-over)
│   │   ├── OpportunityDetailHeader
│   │   ├── OpportunityDetailTabs
│   │   │   ├── DetailsTab (edit form)
│   │   │   ├── ActivityTab (timeline)
│   │   │   ├── FilesTab (attachments)
│   │   │   └── AIInsightsTab
│   │   └── QuickActions
│   │
│   └── KanbanColumn.tsx (UPDATE - add quick stats)
│
├── activities/
│   ├── ActivityTimeline.tsx (NEW)
│   ├── ActivityItem.tsx (NEW)
│   ├── LogEmailModal.tsx (NEW)
│   ├── LogCallModal.tsx (NEW)
│   ├── LogMeetingModal.tsx (NEW)
│   └── ActivityTypeIcon.tsx (NEW)
│
├── attachments/
│   ├── FileUploadZone.tsx (NEW)
│   ├── FileList.tsx (NEW)
│   ├── FilePreview.tsx (NEW)
│   └── FileItem.tsx (NEW)
│
└── ai/
    ├── AIInsightsPanel.tsx (NEW)
    ├── DealScoreCard.tsx (NEW)
    ├── NextActionSuggestions.tsx (NEW)
    ├── RiskFactorsList.tsx (NEW)
    ├── EnrichmentSuggestions.tsx (NEW)
    └── AIBadge.tsx (NEW - indicates AI-generated content)
```

---

### 5.4 State Management Updates

**Zustand Store - Add Slices:**

```typescript
interface PipelineStore {
  // Existing...

  // Activities
  activities: Activity[];
  activityFilters: { opportunityId?: string; type?: string };
  fetchActivities: (workspaceId: string, opportunityId: string) => Promise<void>;
  createActivity: (workspaceId: string, opportunityId: string, data: ActivityInput) => Promise<void>;
  updateActivity: (workspaceId: string, activityId: string, data: Partial<Activity>) => Promise<void>;
  deleteActivity: (workspaceId: string, activityId: string) => Promise<void>;

  // Attachments
  attachments: Attachment[];
  uploadAttachment: (workspaceId: string, opportunityId: string, file: File) => Promise<void>;
  deleteAttachment: (workspaceId: string, attachmentId: string) => Promise<void>;

  // AI
  aiAnalyzing: boolean;
  triggerAIAnalysis: (workspaceId: string, opportunityId: string) => Promise<void>;
  fetchAISuggestions: (workspaceId: string, opportunityId: string) => Promise<string[]>;
  acceptEnrichment: (workspaceId: string, opportunityId: string, field: string, value: any) => Promise<void>;

  // Detail Panel
  selectedOpportunity: Opportunity | null;
  detailPanelOpen: boolean;
  openDetailPanel: (opportunityId: string) => void;
  closeDetailPanel: () => void;
}
```

---

## Part 6: AI Advantages Over Copper

| Feature | Copper CRM | Your AI-Powered CRM |
|---------|-----------|---------------------|
| Email Logging | Manual | ✅ Auto-logged with AI summary |
| Close Probability | Manual input | ✅ AI-calculated + updated in real-time |
| Next Actions | Manual task creation | ✅ AI suggests context-aware actions |
| Data Entry | Manual typing | ✅ Auto-fill from emails + external sources |
| Deal Scoring | Based on stage only | ✅ Multi-factor AI scoring (activity, sentiment, engagement) |
| Risk Detection | None | ✅ AI identifies risk factors ("no activity in 14 days", "competitor mentioned") |
| Email Sentiment | Not tracked | ✅ AI analyzes tone and urgency |
| Contact Enrichment | Paid addon | ✅ Built-in AI + API enrichment |
| Activity Insights | Basic timeline | ✅ AI summarizes patterns ("response time increasing", "high engagement") |
| Pipeline Forecasting | Simple sum | ✅ AI-weighted forecast based on deal scores |
| Conversation Intelligence | Not available | ✅ AI extracts action items, objections, budget mentions from emails |
| Automated Follow-ups | None | ✅ AI detects when follow-up needed + drafts message |

**Unique AI Features You Can Build:**

1. **Email Reply Suggestions:**
   - AI drafts response based on conversation history
   - User edits and sends from CRM

2. **Meeting Prep Briefs:**
   - Before a call, AI generates summary of deal status, last conversation, open questions
   - Shows recommended talking points

3. **Competitor Intelligence:**
   - AI flags when competitors are mentioned
   - Tracks competitive win/loss rates
   - Suggests counter-positioning

4. **Deal Anomaly Detection:**
   - "This deal is moving slower than 80% of similar deals"
   - "High value deal with low activity - needs attention"

5. **Smart Notifications:**
   - "Contact opened your proposal 3 times today"
   - "Prospect mentioned budget approval - suggest moving to negotiation"

6. **Voice of Customer Analysis:**
   - AI analyzes all customer emails to find common objections
   - Surfaces product feature requests
   - Identifies churn risk signals

7. **Auto-Generated Deal Summaries:**
   - Weekly digest: "Here's what happened with your deals this week"
   - Manager dashboards with AI insights per rep

---

## Part 7: Quick Wins (Do These First)

**Highest Impact, Lowest Effort:**

1. **Days in Stage Calculation** (2 hours)
   - Add function to calculate from stageHistory
   - Display on card
   - Add "Stale Deal" warning if > 30 days

2. **Contact & Company Display** (3 hours)
   - Fetch contact/company data in kanban view
   - Show name and photo on card
   - Add avatar component with initials fallback

3. **Last Activity Timestamp** (2 hours)
   - Already have lastActivityAt field
   - Just display with relative time ("2h ago")
   - Add to card metrics row

4. **Deal Temperature** (4 hours)
   - Implement calculation function
   - Add to opportunity model as cached field
   - Display icon on card header
   - Recalculate on activity creation

5. **Next Action Field** (3 hours)
   - Add nextAction and nextActionDueDate to schema
   - Add to opportunity form
   - Display on card footer
   - Highlight if overdue

**Total: ~14 hours (2 days)**

These 5 changes alone will make your pipeline feel 10x more professional.

---

## Part 8: Testing Checklist

**Before Launching:**

- [ ] Drag-drop still works after card redesign
- [ ] Contact photos load correctly (or show initials)
- [ ] Days in stage calculates accurately
- [ ] Temperature indicators update on activity
- [ ] Activity timeline loads without performance issues
- [ ] File uploads work for common formats (PDF, DOCX, PNG, JPG)
- [ ] Email logging creates activity and updates lastActivityAt
- [ ] AI analysis doesn't block UI (runs async)
- [ ] Mobile responsive (cards stack properly)
- [ ] Empty states show helpful messages
- [ ] Error handling (failed file upload, API errors)
- [ ] Permission checks (users can only access their workspace data)
- [ ] Data migrations run successfully (add new fields to existing opportunities)

---

## Part 9: Future Enhancements (After Week 1)

**Phase 2 (Weeks 2-3):**
- Email integration (Gmail/Outlook OAuth)
- Calendar integration (show upcoming meetings)
- Slack notifications for hot deals
- Mobile app (React Native)
- Advanced filtering (date ranges, custom fields)
- Bulk actions (update multiple deals)
- Import/export (CSV, Salesforce migration)

**Phase 3 (Month 2):**
- Reporting dashboard (conversion rates, sales velocity)
- Team collaboration (mentions, shared notes)
- Workflow automation (stage-based triggers)
- Custom fields builder
- Email templates
- Quote/proposal generation
- E-signature integration

**Phase 4 (Month 3+):**
- Revenue forecasting with AI
- Sales coaching recommendations
- Conversation intelligence (call transcription + analysis)
- Predictive lead scoring
- Automated outreach sequences
- Integration marketplace (Zapier, HubSpot, etc.)

---

## Questions Answered

### 1. Exact layout for opportunity cards
**See section 1.1** - Header with temperature + value, contact section with photo, title, metrics row (days in stage, last activity), next action, footer stats.

### 2. Hover actions vs click-to-open
**See section 1.2** - Hybrid approach: Three-dot menu on hover for quick actions (log email/call, edit, delete), card click opens detailed side panel.

### 3. Drag-drop behavior
**See section 1.3** - Enhanced with stage change auto-logging, confirmation toasts, stage-specific actions (won/lost modals), AI re-analysis trigger.

### 4. Deal value display
**See section 1.4** - Large, bold, lime green in header. Compact format for values >$10K. Weighted value in tooltip.

### 5. Activity timeline format
**See section 2.1** - Grouped by date, expandable items, icons per type, AI badge for auto-logged, inline actions (edit/delete/reply).

### 6. Email/call logging UI
**See section 2.2** - Quick modals accessible from card menu, pre-filled contact info, auto-update lastActivityAt, optional next action creation.

### 7. File attachment handling
**See section 2.3** - Drag-drop upload zone, S3/local storage, file preview, download with signed URLs, virus scanning.

### 8. Status indicators
**See section 2.4** - Hot/Warm/Cold based on activity recency, probability, AI score, email responsiveness. Visual: icon + glow + border color.

### What can AI do that Copper can't?
**See section 3 and Part 6** - Auto-log emails, predict close probability, suggest next actions, auto-fill missing data, sentiment analysis, deal scoring, risk detection, conversation intelligence, anomaly detection, smart notifications.

---

## Summary

This blueprint transforms your pipeline into a Copper-quality CRM with AI superpowers in 1 week:

**Days 1-2:** Enhanced cards (photos, company, temperature, days in stage)
**Day 3:** Activity timeline + email/call logging
**Day 4:** File attachments
**Day 5:** Detail side panel
**Days 6-7:** AI features (scoring, suggestions, auto-logging, enrichment)

**Key differentiators from Copper:**
- AI auto-logs emails with summaries
- AI calculates close probability in real-time
- AI suggests next actions based on context
- AI auto-fills missing data from emails and external sources
- Deal temperature based on activity + engagement
- Conversation intelligence and sentiment analysis

**Tech stack additions:**
- Claude API for AI features
- File storage (S3 or local)
- Email integration (Gmail/Outlook API)
- External enrichment APIs (Clearbit, Hunter.io)

Start with the "Quick Wins" (Part 7) to see immediate impact, then layer in AI features for competitive advantage.
