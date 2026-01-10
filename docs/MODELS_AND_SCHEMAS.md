# Clianta - Data Models & Database Schemas

## Overview

Clianta uses **MongoDB** with **Mongoose ODM** for data persistence. The application has **70 Mongoose models** organized by functional category, all implementing multi-tenancy via workspace isolation.

**Location**: `backend/src/models/`

## 1. Model Categories

### Core CRM Models (11 models)
Foundation models for customer relationship management.

| Model | File | Purpose |
|-------|------|---------|
| **User** | `User.ts` | User accounts, authentication, profiles |
| **Project** | `Project.ts` | Workspaces (multi-tenancy container for all data) |
| **Contact** | `Contact.ts` | Individual contacts/leads with custom fields |
| **Company** | `Company.ts` | Organizations/accounts with hierarchical data |
| **Opportunity** | `Opportunity.ts` | Deals/sales opportunities with pipeline stages |
| **Pipeline** | `Pipeline.ts` | Custom deal pipelines with configurable stages |
| **Activity** | `Activity.ts` | Interaction history (emails, calls, meetings, notes) |
| **Task** | `Task.ts` | To-do items and reminders |
| **Ticket** | `Ticket.ts` | Support tickets and customer service issues |
| **CustomFieldDefinition** | `CustomFieldDefinition.ts` | Dynamic field definitions for contacts/companies/deals |
| **TeamMember** | `TeamMember.ts` | Workspace team members and permissions |

---

### Sales Engagement & Campaign Models (12 models)
Email campaigns, lead generation, and visitor tracking.

| Model | File | Purpose |
|-------|------|---------|
| **Campaign** | `Campaign.ts` | Email marketing campaigns with scheduling |
| **CampaignEnrollment** | `CampaignEnrollment.ts` | Contact enrollment in campaigns (many-to-many) |
| **EmailTemplate** | `EmailTemplate.ts` | Reusable email templates with variables |
| **Sequence** | `Sequence.ts` | Multi-step email sequences (drip campaigns) |
| **MultiChannelSequence** | `MultiChannelSequence.ts` | Sequences with email, SMS, tasks |
| **Form** | `Form.ts` | Lead capture forms with custom fields |
| **FormTemplate** | `FormTemplate.ts` | Pre-built form templates |
| **FormSubmission** | `FormSubmission.ts` | Form submission data |
| **LandingPage** | `LandingPage.ts` | Custom landing pages for campaigns |
| **Chatbot** | `Chatbot.ts` | AI chatbot configurations |
| **LeadMagnet** | `LeadMagnet.ts` | Gated content for lead generation |
| **VoiceDrop** | `VoiceDrop.ts` | Ringless voicemail campaigns |

---

### AI & Agent Models (8 models)
Multi-agent system, memory, and AI-generated insights.

| Model | File | Purpose |
|-------|------|---------|
| **AgentSession** | `AgentSession.ts` | AI agent conversation sessions |
| **AgentPerformance** | `AgentPerformance.ts` | Agent performance metrics and analytics |
| **AgentInsight** | `AgentInsight.ts` | AI-generated insights and recommendations |
| **AIClientMemory** | `AIClientMemory.ts` | Long-term memory for AI agents (workspace context) |
| **AINotification** | `AINotification.ts` | Proactive AI notifications and alerts |
| **Conversation** | `Conversation.ts` | Chat conversations with AI |
| **ChatMessage** | `ChatMessage.ts` | Individual chat messages |
| **Meeting** | `Meeting.ts` | Meeting records with AI-generated briefings |

---

### Integration Models (8 active + 3 legacy)
Third-party service connections and sync configurations.

**Active Models**:
| Model | File | Purpose |
|-------|------|---------|
| **EmailAccount** | `EmailAccount.ts` | Connected email accounts (Gmail, Outlook, SMTP) |
| **EmailIntegration** | `EmailIntegration.ts` | Email integration configurations |
| **EmailMessage** | `EmailMessage.ts` | Synced email messages from integrations |
| **CalendarIntegration** | `CalendarIntegration.ts` | Google Calendar OAuth connections |
| **CalendarEvent** | `CalendarEvent.ts` | Synced calendar events |
| **IntegrationCredential** | `IntegrationCredential.ts` | Encrypted OAuth tokens and API keys |
| **ApolloUsage** | `ApolloUsage.ts` | Apollo.io API usage tracking |
| **WebhookSubscription** | `WebhookSubscription.ts` | Webhook configurations for integrations |

**Legacy Models (not in active use)**:
- **SalesforceIntegration** - Salesforce sync configuration (legacy)
- **FieldMapping** - Field mappings for Salesforce (legacy)
- **SyncLog** - Integration sync logs (legacy)

---

### Analytics & Tracking Models (12 models)
Behavioral tracking, scoring, and attribution.

| Model | File | Purpose |
|-------|------|---------|
| **LeadScore** | `LeadScore.ts` | A-F lead scoring with decay rules |
| **IntentSignal** | `IntentSignal.ts` | Behavioral intent signals (page views, downloads) |
| **ContactLifecycleHistory** | `ContactLifecycleHistory.ts` | Lead stage progression history |
| **Attribution** | `Attribution.ts` | Multi-touch attribution for revenue tracking |
| **Visitor** | `Visitor.ts` | Website visitor tracking (anonymous + identified) |
| **CompanyVisitor** | `CompanyVisitor.ts` | Company-level visitor aggregation |
| **TrackingEvent** | `TrackingEvent.ts` | Custom event tracking (button clicks, form views) |
| **EmailTracking** | `EmailTracking.ts` | Email open/click tracking (deprecated in favor of TrackingEvent) |
| **UserAction** | `UserAction.ts` | User activity logs for auditing |
| **Forecast** | `Forecast.ts` | AI-generated revenue forecasts |
| **Proposal** | `Proposal.ts` | Sales proposals with tracking |
| **CallRecording** | `CallRecording.ts` | Call recording metadata and transcriptions |

---

### Sales Intelligence Models (5 models)
Advanced sales tools and competitive intelligence.

| Model | File | Purpose |
|-------|------|---------|
| **BuyingCommittee** | `BuyingCommittee.ts` | Decision-makers mapping for accounts |
| **Battlecard** | `Battlecard.ts` | Competitor battle cards |
| **Competitor** | `Competitor.ts` | Competitor profiles and SWOT analysis |
| **ICPDefinition** | `ICPDefinition.ts` | Ideal Customer Profile definitions |
| **BusinessProfile** | `BusinessProfile.ts` | Workspace business profile for AI context |

---

### Automation & Workflow Models (4 models)
Workflow automation and lead lifecycle.

| Model | File | Purpose |
|-------|------|---------|
| **Workflow** | `Workflow.ts` | Visual workflow automation configurations |
| **WorkflowEnrollment** | `WorkflowEnrollment.ts` | Contact enrollment in workflows |
| **LeadRecycling** | `LeadRecycling.ts` | Automated lead re-engagement campaigns |
| **WarmupActivity** | `WarmupActivity.ts` | Email warmup activities for deliverability |

---

### Miscellaneous Models (8 models)
Supporting models for various features.

| Model | File | Purpose |
|-------|------|---------|
| **Notification** | `Notification.ts` | In-app notifications |
| **Attachment** | `Attachment.ts` | File attachments for various entities |
| **Waitlist** | `Waitlist.ts` | Product waitlist signups |
| **Referral** | `Referral.ts` | Referral program tracking |
| **ContactList** | `ContactList.ts` | Static and dynamic contact segments |
| **MeetingScheduler** | `MeetingScheduler.ts` | Meeting booking configurations |
| **DeliverabilityTest** | `DeliverabilityTest.ts` | Email deliverability test results |
| **OTP** | `OTP.ts` | One-time passwords for auth |

---

## 2. Multi-Tenancy Pattern

### Workspace Isolation
Every model (except `User`, `Waitlist`, `OTP`) includes:
```typescript
workspace: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Project',
  required: true,
  index: true
}
```

### Query Pattern
All queries must filter by workspace:
```typescript
// Correct - workspace-scoped
Contact.find({ workspace: workspaceId, status: 'active' })

// Incorrect - cross-workspace leak
Contact.find({ status: 'active' })  // ❌ Security risk!
```

### Middleware Enforcement
Routes use middleware to verify workspace access:
```typescript
// backend/src/middleware/auth.ts
export const verifyWorkspaceAccess = async (req, res, next) => {
  const { workspaceId } = req.params;
  const userId = req.user._id;

  const hasAccess = await TeamMember.findOne({
    workspace: workspaceId,
    user: userId
  });

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};
```

---

## 3. Indexing Strategy

### Standard Indexes (All Models)
```typescript
// Workspace + createdAt for sorting
{ workspace: 1, createdAt: -1 }

// Workspace + primary identifier (unique within workspace)
{ workspace: 1, email: 1 }, { unique: true }  // Contacts
{ workspace: 1, domain: 1 }, { unique: true } // Companies
```

### Performance Indexes
```typescript
// Contacts
{ workspace: 1, email: 1 }           // Email lookup
{ workspace: 1, owner: 1 }           // Assigned contacts
{ workspace: 1, status: 1 }          // Status filtering
{ workspace: 1, tags: 1 }            // Tag-based queries
{ workspace: 1, leadScore: -1 }      // Score sorting

// Activities
{ workspace: 1, contact: 1, createdAt: -1 }   // Contact timeline
{ workspace: 1, type: 1, createdAt: -1 }      // Activity type filtering

// Opportunities
{ workspace: 1, stage: 1 }           // Pipeline views
{ workspace: 1, owner: 1 }           // Owner's deals
{ workspace: 1, closeDate: 1 }       // Forecasting
```

### Text Search Indexes
```typescript
// Full-text search on name and description
Contact: { name: 'text', notes: 'text' }
Company: { name: 'text', description: 'text' }
Opportunity: { title: 'text', description: 'text' }
```

---

## 4. Relationship Patterns

### Reference Pattern (ObjectId)
Used for most relationships to allow independent updates:
```typescript
contact: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Contact'
}
```

**Pros**: Data normalization, no duplication
**Cons**: Requires populate() or joins

### Embedded Documents Pattern
Used for tightly coupled data:
```typescript
// Workflow has embedded actions (no independent existence)
actions: [{
  type: String,  // 'send_email', 'create_task'
  config: mongoose.Schema.Types.Mixed
}]
```

**Pros**: Atomic updates, single query
**Cons**: Document size limits (16MB in MongoDB)

### Denormalization Pattern
Used for performance-critical fields:
```typescript
// Opportunity caches contact name to avoid populate
contactName: String,
contact: { type: ObjectId, ref: 'Contact' }
```

**Maintenance**: Update cached fields via Mongoose hooks:
```typescript
opportunitySchema.pre('save', async function() {
  if (this.isModified('contact')) {
    const contact = await Contact.findById(this.contact);
    this.contactName = contact.name;
  }
});
```

---

## 5. Key Model Schemas

### Contact Model
```typescript
{
  workspace: ObjectId,          // Required for multi-tenancy
  email: String,                // Primary identifier (unique per workspace)
  name: String,
  phone: String,
  company: ObjectId,            // Reference to Company model
  owner: ObjectId,              // Reference to User (assigned rep)
  status: String,               // 'new', 'contacted', 'qualified', 'lost'
  leadScore: String,            // 'A', 'B', 'C', 'D', 'F'
  leadScoreValue: Number,       // Numeric score (0-100)
  lifecycleStage: String,       // 'lead', 'MQL', 'SQL', 'opportunity', 'customer'
  tags: [String],
  customFields: Mixed,          // Dynamic fields based on CustomFieldDefinition
  source: String,               // 'manual', 'import', 'form', 'api'
  lastContactedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ workspace: 1, email: 1 }` (unique)
- `{ workspace: 1, leadScore: -1 }`
- `{ workspace: 1, owner: 1 }`

---

### Company Model
```typescript
{
  workspace: ObjectId,
  name: String,
  domain: String,               // Primary identifier (unique per workspace)
  industry: String,
  size: String,                 // '1-10', '11-50', '51-200', etc.
  revenue: Number,
  website: String,
  description: String,
  customFields: Mixed,
  contacts: [ObjectId],         // Array of Contact references
  opportunities: [ObjectId],    // Array of Opportunity references
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ workspace: 1, domain: 1 }` (unique)
- `{ workspace: 1, name: 1 }`

---

### Opportunity Model
```typescript
{
  workspace: ObjectId,
  title: String,
  contact: ObjectId,            // Primary contact
  company: ObjectId,            // Associated company
  pipeline: ObjectId,           // Reference to Pipeline
  stage: String,                // Current pipeline stage
  amount: Number,               // Deal value
  probability: Number,          // Win probability (0-100)
  expectedCloseDate: Date,
  actualCloseDate: Date,
  status: String,               // 'open', 'won', 'lost'
  owner: ObjectId,              // Assigned rep
  customFields: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ workspace: 1, pipeline: 1, stage: 1 }`
- `{ workspace: 1, owner: 1 }`
- `{ workspace: 1, expectedCloseDate: 1 }`

---

### Workflow Model
```typescript
{
  workspace: ObjectId,
  name: String,
  description: String,
  trigger: {
    type: String,               // 'contact_created', 'field_updated', 'form_submitted'
    conditions: [{              // Filter criteria
      field: String,
      operator: String,
      value: Mixed
    }]
  },
  actions: [{                   // Workflow steps
    type: String,               // 'send_email', 'create_task', 'update_field'
    config: Mixed,              // Action-specific configuration
    delay: Number               // Delay in seconds
  }],
  status: String,               // 'active', 'paused', 'draft'
  enrollmentCount: Number,      // Total enrollments
  createdAt: Date,
  updatedAt: Date
}
```

**Related Models**:
- `WorkflowEnrollment`: Tracks individual contact progress through workflow
- Action services in `backend/src/services/workflow/actions/`

---

### LeadScore Model
```typescript
{
  workspace: ObjectId,
  contact: ObjectId,
  grade: String,                // 'A', 'B', 'C', 'D', 'F'
  score: Number,                // Numeric score (0-100)
  factors: [{                   // Score breakdown
    category: String,           // 'demographic', 'firmographic', 'behavioral'
    points: Number,
    reason: String
  }],
  lastCalculatedAt: Date,
  decay: {
    enabled: Boolean,
    rate: Number                // Points lost per day
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Scoring Logic**: See `backend/src/services/leadScoring.ts`

---

### AIClientMemory Model
```typescript
{
  workspace: ObjectId,
  entity: ObjectId,             // Contact, Company, or Deal
  entityType: String,           // 'contact', 'company', 'opportunity'
  memoryType: String,           // 'preference', 'context', 'insight'
  content: String,              // AI-generated memory text
  confidence: Number,           // 0-1 confidence score
  source: String,               // 'email', 'call', 'meeting', 'manual'
  metadata: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

**Purpose**: Long-term memory for AI agents to remember context about contacts, companies, and deals.

---

## 6. Custom Fields System

### Architecture
Clianta supports **dynamic custom fields** on Contacts, Companies, and Opportunities.

### CustomFieldDefinition Model
```typescript
{
  workspace: ObjectId,
  entityType: String,           // 'contact', 'company', 'opportunity'
  fieldName: String,            // Internal identifier (e.g., 'custom_industry')
  label: String,                // Display name (e.g., 'Industry')
  type: String,                 // 'text', 'number', 'date', 'select', 'multiselect'
  options: [String],            // For select/multiselect types
  required: Boolean,
  defaultValue: Mixed,
  validation: {
    min: Number,                // For number/date types
    max: Number,
    regex: String               // For text types
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Storage Pattern
Custom field values stored in `customFields` object on each entity:
```typescript
// Contact document
{
  email: 'john@acme.com',
  name: 'John Doe',
  customFields: {
    custom_industry: 'SaaS',
    custom_employee_count: 150,
    custom_tech_stack: ['React', 'Node.js']
  }
}
```

### Validation
Custom field validation enforced at:
1. **Application Layer**: Zod schemas in `backend/src/validations/`
2. **Service Layer**: `CustomFieldService` validates against definitions
3. **Frontend**: React Hook Form with dynamic schemas

---

## 7. Migration Strategy

### Schema Evolution
- **Additive Changes**: Add new fields with default values (safe)
- **Breaking Changes**: Create migration scripts in `backend/src/migrations/`
- **Versioning**: Not currently implemented (all models on latest schema)

### Migration Example
```typescript
// backend/src/migrations/20240101_add_lifecycleStage_to_contacts.ts
import Contact from '../models/Contact';

export async function up() {
  await Contact.updateMany(
    { lifecycleStage: { $exists: false } },
    { $set: { lifecycleStage: 'lead' } }
  );
}

export async function down() {
  await Contact.updateMany(
    {},
    { $unset: { lifecycleStage: '' } }
  );
}
```

**Note**: Migration system not currently implemented - manual migrations via MongoDB Compass or scripts.

---

## 8. Data Integrity

### Cascade Delete
Implemented via Mongoose middleware:
```typescript
// When Contact is deleted, delete all related data
contactSchema.pre('deleteOne', { document: true, query: false }, async function() {
  const contactId = this._id;

  // Delete activities
  await Activity.deleteMany({ contact: contactId });

  // Delete workflow enrollments
  await WorkflowEnrollment.deleteMany({ contact: contactId });

  // Remove from campaigns
  await CampaignEnrollment.deleteMany({ contact: contactId });
});
```

### Referential Integrity
- **Mongoose virtuals**: Populate references dynamically
- **Pre-save hooks**: Validate references exist before saving
- **Soft delete**: Use `status: 'deleted'` instead of actual deletion (for critical data)

---

## 9. Performance Considerations

### Query Optimization
```typescript
// ❌ Bad: N+1 query problem
const contacts = await Contact.find({ workspace });
for (const contact of contacts) {
  contact.company = await Company.findById(contact.company);
}

// ✅ Good: Use populate
const contacts = await Contact.find({ workspace })
  .populate('company')
  .populate('owner', 'name email');
```

### Lean Queries
```typescript
// ❌ Bad: Returns full Mongoose documents (slow for large datasets)
const contacts = await Contact.find({ workspace });

// ✅ Good: Returns plain JavaScript objects (fast)
const contacts = await Contact.find({ workspace }).lean();
```

### Pagination
```typescript
// Always paginate large datasets
const page = 1;
const limit = 50;
const skip = (page - 1) * limit;

const contacts = await Contact.find({ workspace })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
```

---

## 10. Model Relationships Diagram

```
User
  ├─▶ TeamMember ─▶ Project (Workspace)
  └─▶ Notification

Project (Workspace) [Multi-Tenancy Container]
  ├─▶ Contact
  │    ├─▶ Company
  │    ├─▶ Activity
  │    ├─▶ LeadScore
  │    ├─▶ IntentSignal
  │    ├─▶ WorkflowEnrollment
  │    ├─▶ CampaignEnrollment
  │    └─▶ AIClientMemory
  │
  ├─▶ Company
  │    ├─▶ Contact (many)
  │    ├─▶ Opportunity (many)
  │    ├─▶ CompanyVisitor
  │    └─▶ BuyingCommittee
  │
  ├─▶ Opportunity
  │    ├─▶ Contact
  │    ├─▶ Company
  │    ├─▶ Pipeline
  │    └─▶ Activity
  │
  ├─▶ Campaign
  │    ├─▶ EmailTemplate
  │    └─▶ CampaignEnrollment ─▶ Contact
  │
  ├─▶ Workflow
  │    └─▶ WorkflowEnrollment ─▶ Contact
  │
  ├─▶ EmailAccount
  │    └─▶ EmailMessage
  │
  ├─▶ CalendarIntegration
  │    └─▶ CalendarEvent
  │
  ├─▶ SalesforceIntegration
  │    └─▶ SyncLog
  │
  ├─▶ Form
  │    └─▶ FormSubmission
  │
  └─▶ AgentSession
       └─▶ ChatMessage
```

---

## Summary

Clianta's data layer consists of:
- **70 Mongoose models** across 7 functional categories
- **Multi-tenancy** via workspace isolation on all models
- **Custom fields** for dynamic schema extension
- **Comprehensive indexing** for performance
- **Referential integrity** via Mongoose middleware
- **Event-driven updates** via BullMQ for async processing

**Best Practices**:
1. Always filter by `workspace` in queries
2. Use indexes for frequently queried fields
3. Populate sparingly (performance impact)
4. Use `.lean()` for read-only operations
5. Implement cascade delete via middleware
6. Validate custom fields against definitions

For schema-specific implementation details, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Database architecture overview
- [API_ROUTES_MAP.md](./API_ROUTES_MAP.md) - API endpoints for each model
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Integration-specific models
