# Form System Documentation

## Overview

The MorrisB Form System is a comprehensive form builder and submission management system similar to HubSpot Forms. It allows users to create customizable forms, embed them on websites, capture leads, and automatically create contacts in the CRM.

---

## System Components

### 1. **Form Builder** (`/projects/[id]/forms/[formId]/edit`)
**Purpose**: Create and configure forms with advanced features

**What it does:**
- Provides a visual drag-and-drop interface to build forms
- Allows adding 25+ different field types (text, email, phone, dropdown, file upload, ratings, etc.)
- Configures field properties (validation, CRM mapping, conditional logic, styling)
- Sets up multi-step forms (wizard-style)
- Configures form settings (colors, layout, success messages, notifications)
- Enables progressive profiling (hide fields if contact data already known)
- Sets up lead routing rules (auto-assign to team members)
- Creates automated follow-up actions (emails, tasks, webhooks)
- Generates embed codes for websites

**User Actions:**
1. Add fields from sidebar by clicking field types
2. Configure each field (label, placeholder, required, validation, CRM mapping)
3. Drag fields to reorder
4. Customize appearance (colors, layout, spacing)
5. Set up notifications (who gets notified when form is submitted)
6. Save and publish form
7. Copy embed code or direct link

**Output:**
- A `Form` document saved to MongoDB with all configuration
- Embed codes (iframe or direct) for website integration
- Public form URL for sharing

---

### 2. **Public Form Page** (`/forms/[formId]`)
**Purpose**: The actual form that end-users fill out

**What it does:**
- Renders the form fields according to builder configuration
- Displays correct HTML input types (email inputs show @, number inputs show numeric keyboard, date pickers, etc.)
- Validates user input (required fields, email format, URL format, file size/type)
- Applies conditional logic (show/hide fields based on other field values)
- Tracks form views and user behavior
- Captures source data (URL, referrer, UTM parameters)
- Submits form data to backend
- Shows success message or redirects after submission

**User Actions (Form Visitor):**
1. Visitor opens form URL or visits page with embedded form
2. Fills out form fields
3. Clicks submit button
4. Sees success message or gets redirected

**Data Captured:**
- **Form Field Data**: All user-entered information
- **Source Tracking**:
  - Page URL where form was submitted
  - Referrer (where visitor came from)
  - UTM parameters (utm_source, utm_medium, utm_campaign)
  - User agent (browser/device info)
  - IP address
- **Visitor Identification**: Email for tracking returning visitors

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FORM CREATION                             │
└─────────────────────────────────────────────────────────────────┘

User (Form Builder)
    ↓
    [Adds fields, configures settings, sets up automation]
    ↓
Frontend: /projects/[id]/forms/[formId]/edit
    ↓
    [POST/PUT] /api/workspaces/{workspaceId}/forms
    ↓
Backend: form.ts routes
    ↓
MongoDB: Form collection
    ↓
Generates: Embed code, Public URL


┌─────────────────────────────────────────────────────────────────┐
│                      FORM SUBMISSION                             │
└─────────────────────────────────────────────────────────────────┘

Website Visitor
    ↓
    Opens form at /forms/[formId]
    ↓
Frontend: Public Form Page
    ↓
    [Loads form] GET /api/public/forms/{formId}
    ↓
    Renders fields with correct input types
    ↓
Visitor fills out form
    ↓
    [Submits data] POST /api/public/forms/{formId}/submit
    ↓
Backend: Form Submission Handler
    ↓
    1. Validates data
    2. Creates FormSubmission document
    3. Checks for existing contact (by email)
    4. Creates/updates Contact in CRM
    5. Maps form fields to CRM fields
       (email → contact.email, phone → contact.phone, etc.)
    6. Increments form stats (views, submissions)
    7. Sends notification emails (if configured)
    8. Triggers follow-up actions (tasks, webhooks)
    9. Applies lead routing rules
    ↓
MongoDB: FormSubmission + Contact collections
    ↓
Response: Success message + redirect URL (optional)
    ↓
Visitor sees success message
```

---

## Database Collections

### **Form Collection**
Stores form configuration created in form builder

**Key Fields:**
- `name`: Form title
- `fields[]`: Array of field definitions (type, label, validation, CRM mapping)
- `steps[]`: Multi-step configuration (if enabled)
- `settings`: Appearance, behavior, notifications
- `stats`: Views, submissions, conversion rate
- `status`: draft | published | archived

### **FormSubmission Collection**
Stores each form submission from visitors

**Key Fields:**
- `formId`: Which form was submitted
- `workspaceId`: Which workspace/project
- `data{}`: Key-value pairs of form field responses
- `source`: URL, referrer, UTM params, user agent, IP
- `contactId`: Reference to created/updated Contact
- `contactCreated`: Boolean - was new contact created?
- `status`: new | contacted | qualified | spam | archived
- `createdAt`: Submission timestamp

### **Contact Collection** (Linked)
CRM contacts created/updated from form submissions

**Key Fields:**
- `email`: Primary identifier
- `firstName`, `lastName`: Name fields
- `phone`, `company`, `jobTitle`: Business info
- `customFields{}`: Additional mapped fields
- `source`: Where contact came from (form_submission)
- `formId`, `formName`: Which form created this contact

---

## Field Type Examples

| Field Type | HTML Input | Use Case |
|-----------|-----------|----------|
| `text` | `<input type="text">` | Name, Title, Short Answer |
| `email` | `<input type="email">` | Email Address (with @ validation) |
| `phone` | `<input type="tel">` | Phone Number |
| `number` | `<input type="number">` | Age, Quantity, Budget |
| `url` | `<input type="url">` | Website (with http:// validation) |
| `date` | `<input type="date">` | Birth Date, Event Date |
| `select` | `<select>` | Dropdown (Industry, Role, etc.) |
| `textarea` | `<textarea>` | Long text (Comments, Bio) |
| `file` | `<input type="file">` | Upload Resume, Documents |
| `rating` | Custom stars | Product/Service Rating |
| `checkbox` | Multiple checkboxes | Interests, Services Needed |
| `radio` | Radio buttons | Single choice (Yes/No, Plan) |
| `country` | Country dropdown | Location |
| `gdpr_consent` | Styled checkbox | Privacy consent |

---

## CRM Field Mapping

**How it works:**
- In form builder, each field can be mapped to a CRM field
- When form is submitted, data flows to Contact record

**Example:**
```javascript
// Form Field Configuration
{
  id: "field_email",
  type: "email",
  label: "Your Email",
  mapToField: "email"  // ← Maps to contact.email
}

{
  id: "field_company",
  type: "text",
  label: "Company Name",
  mapToField: "company"  // ← Maps to contact.company
}

// When submitted, creates:
Contact {
  email: "user@example.com",    // from field_email
  company: "Acme Corp",          // from field_company
  source: "form_submission",
  formId: "67890",
  formName: "Contact Us Form"
}
```

**Available CRM Mappings:**
- `firstName`, `lastName` → Name
- `email` → Email (primary identifier)
- `phone` → Phone Number
- `company` → Company/Organization
- `jobTitle` → Job Title/Role
- `website` → Company Website
- `address`, `city`, `state`, `country`, `zip` → Location
- `industry` → Industry/Vertical
- `revenue` → Annual Revenue
- `employees` → Company Size
- `custom` → Custom Fields

---

## Key Features

### **1. Progressive Profiling**
- If contact already exists (matched by email)
- Fields marked as "progressive" hide automatically
- Shows different questions to returning visitors
- Reduces form friction, increases completion

### **2. Conditional Logic**
- Show/hide fields based on previous answers
- Example: Show "Company Size" only if user selects "Business" account type
- Supports: equals, notEquals, contains, isEmpty, greaterThan, lessThan
- Can combine multiple conditions with AND/OR

### **3. Multi-Step Forms**
- Break long forms into multiple steps (wizard)
- Improves completion rate
- Each step can have conditional logic
- Progress indicator shows current step

### **4. Lead Routing**
- Automatically assign leads to team members
- Based on form field values (location, company size, etc.)
- Round-robin distribution
- Priority-based rules

### **5. Form Analytics**
- Track views, submissions, conversion rate
- Field-level completion rates
- Abandonment analysis
- Average time to complete
- Source tracking (which campaigns drive submissions)

### **6. Notifications & Automations**
- Send email notifications to team when form submitted
- Auto-create tasks for follow-up
- Trigger webhooks to external systems
- Slack notifications
- Salesforce sync

---

## Security & Privacy

### **GDPR Compliance**
- Consent checkboxes (required/optional)
- Data retention policies (auto-delete after X days)
- Allow contacts to export their data
- Allow contacts to delete their data
- Privacy policy links

### **Validation**
- Server-side validation (never trust client)
- Email format validation
- URL format validation
- File size/type restrictions
- Custom validation rules (regex patterns)

### **Spam Protection**
- CAPTCHA support (optional)
- Submission rate limiting
- Honeypot fields (hidden from humans, caught by bots)

---

## Embed Options

### **1. Iframe Embed** (Recommended)
```html
<iframe
  src="https://yoursite.com/forms/[formId]"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```
**Pros**: Works on any website, sandboxed, secure

### **2. Direct Embed**
```html
<script src="https://yoursite.com/forms/embed.js"></script>
<div data-morrisb-form="[formId]"></div>
```
**Pros**: Better performance, native styling
**Cons**: Same domain only

### **3. Direct Link**
```
https://yoursite.com/forms/[formId]
```
**Pros**: Share via email, social media, QR codes

---

## Common Use Cases

1. **Lead Generation**
   - Capture contact info from website visitors
   - Auto-create leads in CRM
   - Route to sales team
   - Send welcome email

2. **Event Registration**
   - Collect attendee information
   - Send confirmation email
   - Create calendar event
   - Send reminder before event

3. **Contact Us**
   - Simple contact form
   - Notify support team
   - Create support ticket
   - Track response time

4. **Survey/Feedback**
   - Collect customer feedback
   - Rating fields
   - Multi-step for long surveys
   - Analyze responses

5. **Newsletter Signup**
   - Email + marketing consent
   - Add to email list (Mailchimp integration)
   - Send welcome series
   - Track engagement

---

## Performance Optimizations

- **Progressive Form Loading**: Only load visible step fields
- **Conditional Field Hiding**: Reduce form complexity
- **Client-side Validation**: Instant feedback, reduce server load
- **Debounced Autosave**: Save drafts without hammering server
- **Lazy Load Options**: Load country/state lists on demand
- **Form Caching**: Cache published forms (no DB hit per view)
- **Compression**: Gzip form submissions

---

## Summary

**Form Builder** = Configuration interface (what the form looks like and does)
**Public Form Page** = The actual form users fill out (renders based on builder config)
**Form Submission** = Captured data + source tracking
**Contact Creation** = Automatic CRM entry with field mapping
**Automations** = Post-submission actions (emails, tasks, webhooks)

The entire system creates a complete lead capture → CRM integration → follow-up automation pipeline.
