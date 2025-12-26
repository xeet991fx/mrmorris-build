# MorrisB Lead Generation Setup - Summary

## What's Been Built

A complete **HubSpot-style inbound lead generation system** that tracks anonymous visitors and converts them into contacts automatically.

---

## 🎯 Key Features

### 1. Visitor Tracking
- **Tracking script** (`/track.js`) - Installed on any website
- **Anonymous visitor ID** stored in `mb_visitor_id` cookie
- **Session tracking** with 30-minute timeout
- **UTM attribution** - First touch & last touch campaign tracking
- **Event tracking** - Page views, button clicks, form submissions

### 2. Embedded Forms (HubSpot-Style Portal)
- **Iframe embedding** - Cross-domain safe, works anywhere
- **Direct embedding** - Faster for same-domain sites
- **Auto-linking** - Forms automatically connect to visitor tracking
- **PostMessage API** - Height adjustment & parent communication

### 3. Visitor → Contact Conversion
- **Form submission** triggers automatic contact creation
- **Identity resolution** - Links `visitorId` to `contactId`
- **Historical backfill** - All past tracking events get linked to contact
- **Lead scoring** - Automatic grading based on engagement

### 4. Email Integration
- **Gmail inbox** - View and reply to leads
- **Auto-sync** - Email replies sync every 5 minutes (BullMQ)
- **AI drafts** - Generate replies with AI

---

## 📋 How Clients Set Up Tracking

### Option 1: Use MorrisB Landing Pages (Automatic)
- Create landing page in MorrisB
- Tracking is automatically enabled
- **Best for:** New campaigns, lead magnets

### Option 2: WordPress Plugin (1-Click)
- Download MorrisB WordPress plugin
- Install and activate
- Enter Workspace ID
- **Best for:** WordPress websites

### Option 3: Manual Installation
```html
<!-- Paste before </head> tag -->
<script src="https://api.morrisb.com/track.js"></script>
<script>
  morrisb('WORKSPACE_ID');
</script>
```
**Best for:** Webflow, Shopify, custom sites

---

## 🎨 How to Embed Forms

### Step 1: Create Form
1. Go to workspace → Forms → Create New Form
2. Add fields (email, name, company, etc.)
3. Publish the form

### Step 2: Get Embed Code
1. Click "Embed" tab
2. Choose embedding mode:
   - **Iframe Mode** (recommended) - Cross-domain safe
   - **Direct Mode** - Faster for same domain
3. Click "Copy Code"

### Step 3: Paste on Website
```html
<!-- Iframe Mode (Recommended) -->
<script src="https://app.morrisb.com/forms/embed.js"></script>
<div data-morrisb-form="FORM_ID"></div>

<!-- Direct Mode (Same Domain) -->
<script src="https://app.morrisb.com/forms/embed.js"></script>
<div
  data-morrisb-form="FORM_ID"
  data-morrisb-mode="direct"
  data-morrisb-workspace="WORKSPACE_ID"
></div>
```

---

## 🔄 Lead Generation Flow

```
1. Anonymous visitor lands on website
   ↓ (tracking script assigns mb_visitor_id)

2. Page views tracked to TrackingEvent collection
   ↓ (visitor browses, UTM params captured)

3. Visitor views embedded form
   ↓ (form_view event tracked)

4. Visitor submits form
   ↓ (form_submit event tracked)

5. Contact created automatically
   ↓ (email, name, company saved)

6. Identity resolution
   ↓ (visitorId linked to contactId)

7. Historical events backfilled
   ↓ (all past tracking events now linked to contact)

8. Webhook fires: visitor.identified, form.submitted
   ↓ (integrations triggered)

9. Lead scoring runs
   ↓ (A/B/C/D grade assigned)

10. Email sequence starts (if workflow exists)
    ↓ (nurture automation begins)
```

---

## 📊 Dashboard Pages

### Visitors Analytics (`/projects/[id]/visitors`)
- List of anonymous visitors
- Session count, page views
- Conversion funnel metrics
- UTM source breakdown

### Forms (`/projects/[id]/forms`)
- Form builder with drag-and-drop (basic)
- Embed code generator
- Form submissions dashboard

### Tracking Setup (`/projects/[id]/settings/tracking`)
- 3 setup options (Landing Pages, WordPress, Manual)
- Copy-paste code snippets
- Workspace ID display

### Inbox (`/projects/[id]/inbox`)
- Gmail integration
- AI-powered reply drafts
- Thread view
- Auto-sync every 5 minutes

---

## 🗂️ Key Files

### Backend
- `backend/src/models/TrackingEvent.ts` - Visitor behavior events
- `backend/src/models/Visitor.ts` - Anonymous visitor tracking
- `backend/src/routes/tracking.ts` - Tracking API endpoints
- `backend/src/jobs/emailSyncJob.ts` - Email auto-sync (BullMQ)
- `backend/src/server.ts` - Endpoints for `/track.js` and `/forms/embed.js`

### Frontend
- `frontend/public/track.js` - Client tracking library
- `frontend/public/forms/embed.js` - Form embed script
- `frontend/app/projects/[id]/visitors/page.tsx` - Visitor analytics
- `frontend/app/projects/[id]/settings/tracking/page.tsx` - Setup instructions
- `frontend/app/forms/[formId]/page.tsx` - Public form with postMessage

### WordPress Plugin
- `integrations/wordpress/morrisb-tracking/morrisb-tracking.php`

---

## 🎯 HubSpot Feature Parity

| Feature | HubSpot | MorrisB |
|---------|---------|---------|
| Tracking Code | ✅ | ✅ |
| Anonymous Visitor Tracking | ✅ | ✅ |
| Form Builder | ✅ | ✅ (basic) |
| Embedded Forms (Portal) | ✅ | ✅ |
| Landing Pages | ✅ | ✅ |
| Email Inbox | ✅ | ✅ |
| Lead Scoring | ✅ | ✅ |
| Webhooks | ✅ | ✅ (21+ events) |
| WordPress Plugin | ✅ | ✅ |
| AI Agents | ⚠️ Basic | ✅ 22 agents |
| Apollo Enrichment | ❌ | ✅ |

---

## ✅ Status: Production Ready

All core features are implemented and tested:
- ✅ Visitor tracking with cookie-based identity
- ✅ HubSpot-style embedded forms (iframe + direct modes)
- ✅ Automatic contact creation from form submissions
- ✅ Identity resolution (anonymous → identified)
- ✅ Email inbox with Gmail auto-sync
- ✅ WordPress plugin for one-click setup
- ✅ Beautiful UI with embed code generator

**Next steps:** Test with real websites and gather user feedback.
