# 🚀 Morris CRM - Feature Status & Guide

## Quick Status Overview

| Feature | Status | Backend | Frontend | Requirements |
|---------|--------|---------|----------|--------------|
| **Contacts** | ✅ Ready | ✅ | ✅ | - |
| **Companies** | ✅ Ready | ✅ | ✅ | - |
| **Pipelines & Deals** | ✅ Ready | ✅ | ✅ | - |
| **Email Accounts** | ✅ Ready | ✅ | ✅ | Gmail/SMTP credentials |
| **Email Templates** | ✅ Ready | ✅ | ✅ | - |
| **Campaigns** | ✅ Ready | ✅ | ✅ | Email account + contacts with email |
| **Sequences** | ✅ Ready | ✅ | ✅ | Email templates |
| **Workflows** | ✅ Ready | ✅ | ✅ | - |
| **Inbox** | ✅ Ready | ✅ | ✅ | Email account connected |
| **AI Draft** | ⚠️ Needs Config | ✅ | ✅ | `GEMINI_API_KEY` in `.env` |
| **Lead Scores** | ✅ Ready | ✅ | ✅ | - |
| **Data Stewardship** | ⚠️ Needs Config | ✅ | ✅ | `APOLLO_API_KEY` in `.env` |
| **Email Analytics** | ✅ Ready | ✅ | ✅ | Campaign data |
| **Custom Fields** | ✅ Ready | ✅ | ✅ | - |
| **Apollo Enrichment** | ⚠️ Needs Config | ✅ | ✅ | `APOLLO_API_KEY` in `.env` |

---

## 📧 How Campaigns Work

**Purpose:** Send bulk email campaigns to contacts

### Prerequisites:
1. **Email Account** - Connect Gmail or SMTP at `/email-accounts`
2. **Contacts with Emails** - Import or add contacts that have email addresses
3. **Email Template** (optional) - Create at `/email-templates`

### Flow:
```
1. Create Campaign → 2. Add Contacts → 3. Write/Select Email → 4. Schedule/Send
```

> ⚠️ **Campaigns do NOT find emails.** You must have contacts with email addresses already.

---

## 📥 How Inbox Works

**Purpose:** Unified inbox for all connected email accounts

### Prerequisites:
1. Connect email account at `/email-accounts`
2. Enable sync in email integration settings

### Features:
- View all received emails
- Reply directly from CRM
- **AI Draft** - Generate AI reply using Gemini (requires `GEMINI_API_KEY`)
- Sentiment analysis on incoming emails

---

## ⚡ How Workflows Work

**Purpose:** Automate actions based on triggers

### Triggers:
| Trigger | When it fires |
|---------|--------------|
| `contact_created` | New contact added |
| `contact_updated` | Contact modified |
| `deal_created` | New deal added |
| `deal_stage_changed` | Deal moves pipeline stage |
| `email_opened` | Email tracking pixel loaded |
| `email_clicked` | Link in email clicked |
| `contact_job_changed` | Apollo detects job change |

### Actions:
| Action | What it does |
|--------|-------------|
| `send_email` | Send email to contact |
| `update_field` | Update contact/deal field |
| `create_task` | Create a task |
| `add_to_sequence` | Add contact to email sequence |
| `wait` | Wait X minutes/hours/days |
| `branch` | Conditional logic (if/then) |

### Workflow Builder:
- Visual drag-and-drop builder at `/workflows`
- Connect triggers → actions → more actions

---

## 🛡️ Data Stewardship (Data Quality)

**Purpose:** Keep contact data fresh and accurate

### Features:
| Feature | Description |
|---------|-------------|
| **Verify Button** | Calls Apollo API to verify contact info is current |
| **Needs Verification** | Contacts not verified recently |
| **Left Company** | Apollo detected they changed jobs |
| **Scan All** | Batch verify all contacts |

### Requirement:
```env
APOLLO_API_KEY=your_apollo_api_key_here
```
Get key at: https://app.apollo.io/#/settings/integrations/api

---

## 📊 Email Analytics

**Purpose:** Track email campaign performance

### Metrics:
- Open rate, Click rate, Reply rate, Bounce rate
- Per-campaign breakdown

> Works automatically once you run campaigns with tracking enabled.

---

## 📝 Custom Fields

**Purpose:** Add extra fields to contacts/companies/deals

### Examples:
- "Contract Expiry Date" (date)
- "Preferred Language" (dropdown)
- "Revenue Potential" (number)

---

## 🔑 Required API Keys

Add these to `backend/.env`:

```env
# Email (choose one)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
# OR
SMTP_HOST=smtp.example.com
SMTP_USER=xxx
SMTP_PASS=xxx

# AI Features
GEMINI_API_KEY=your_gemini_key      # For AI email drafts

# Data Enrichment
APOLLO_API_KEY=your_apollo_key      # For contact enrichment
```

---

## ✅ All Backend Routes

| Route | Purpose |
|-------|---------|
| `/api/auth` | Login, register, OAuth |
| `/api/projects` | Workspaces |
| `/api/workspaces/:id/contacts` | Contact CRUD |
| `/api/workspaces/:id/companies` | Company CRUD |
| `/api/workspaces/:id/pipelines` | Pipeline management |
| `/api/workspaces/:id/opportunities` | Deal management |
| `/api/workspaces/:id/workflows` | Workflow automation |
| `/api/workspaces/:id/sequences` | Email sequences |
| `/api/workspaces/:id/email-templates` | Email templates |
| `/api/email-accounts` | Connected email accounts |
| `/api/campaigns` | Email campaigns |
| `/api/inbox` | Email inbox |
| `/api/enrichment` | Apollo enrichment |
| `/api/email-tracking` | Email open/click tracking |
| `/api/workspaces/:id/lead-scores` | Lead scoring |
| `/api/workspaces/:id/custom-fields` | Custom field definitions |
