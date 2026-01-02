# OAuth Integration Setup Guide

This guide will help you configure OAuth for Slack, Google Sheets, and Notion integrations.

## Overview

Each integration requires:
1. Creating an OAuth app with the service provider
2. Configuring environment variables
3. Setting up redirect URIs
4. Backend OAuth routes (already implemented in plan)

---

## 1. Slack OAuth Setup

### Step 1: Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Enter app name (e.g., "MrMorris Workflow Automation")
4. Select your development workspace
5. Click "Create App"

### Step 2: Configure OAuth & Permissions

1. In your app settings, go to "OAuth & Permissions"
2. Add Redirect URL:
   - Development: `http://localhost:4000/api/integrations/slack/oauth/callback`
   - Production: `https://yourdomain.com/api/integrations/slack/oauth/callback`
3. Scroll to "Scopes" section
4. Add these **Bot Token Scopes** (required for all actions):
   - `channels:read` - List public channels
   - `channels:write` - Create channels, set topics
   - `channels:manage` - Manage channel settings
   - `chat:write` - Send messages
   - `users:read` - List workspace users
   - `reactions:write` - Add reactions
   - `files:write` - Upload files
   - `channels:join` - Join channels
   - `im:write` - Send direct messages

### Step 3: Install to Workspace

1. Go to "Install App" in sidebar
2. Click "Install to Workspace"
3. Authorize the app
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### Step 4: Get Credentials

1. Go to "Basic Information" in sidebar
2. Under "App Credentials", copy:
   - **Client ID**
   - **Client Secret**

### Step 5: Add to Environment Variables

Add to `backend/.env`:

```bash
# Slack OAuth
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_REDIRECT_URI=http://localhost:4000/api/integrations/slack/oauth/callback
```

---

## 2. Google Sheets OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "MrMorris Workflows")
4. Click "Create"

### Step 2: Enable Google Sheets API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and click "Enable"
4. Also enable "Google Drive API" (required for file access)

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (for testing) or Internal (for organization)
   - App name: "MrMorris Workflows"
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Add these scopes:
     - `https://www.googleapis.com/auth/spreadsheets` (read/write sheets)
     - `https://www.googleapis.com/auth/drive.readonly` (list files)
   - Test users: Add your Google account email
4. Back in Credentials, create OAuth client ID:
   - Application type: "Web application"
   - Name: "MrMorris Backend"
   - Authorized redirect URIs:
     - `http://localhost:4000/api/integrations/google-sheets/oauth/callback`
     - `https://yourdomain.com/api/integrations/google-sheets/oauth/callback`
5. Click "Create"
6. Copy **Client ID** and **Client Secret**

### Step 4: Add to Environment Variables

Add to `backend/.env`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:4000/api/integrations/google-sheets/oauth/callback
```

---

## 3. Notion OAuth Setup

### Step 1: Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Enter integration name (e.g., "MrMorris Workflows")
4. Select associated workspace
5. Set capabilities:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
6. Click "Submit"

### Step 2: Get Integration Credentials

1. Copy the **Internal Integration Token** (starts with `secret_`)
2. Scroll down to "OAuth Domain & URIs"
3. Add Redirect URI:
   - Development: `http://localhost:4000/api/integrations/notion/oauth/callback`
   - Production: `https://yourdomain.com/api/integrations/notion/oauth/callback`

### Step 3: Convert to Public Integration

1. Go to "Distribution" tab
2. Toggle "Make this integration public"
3. Fill in required information:
   - Integration name
   - Description
   - Website
   - Privacy policy URL
   - Terms of service URL
4. Copy **OAuth client ID** and **OAuth client secret**

### Step 4: Add to Environment Variables

Add to `backend/.env`:

```bash
# Notion OAuth
NOTION_CLIENT_ID=your_client_id_here
NOTION_CLIENT_SECRET=your_client_secret_here
NOTION_REDIRECT_URI=http://localhost:4000/api/integrations/notion/oauth/callback
```

---

## Backend Implementation Checklist

### Required Backend Files (from plan)

The following files need to be created according to the plan in `~/.claude/plans/`:

#### 1. Integration Credential Model
- [ ] `backend/src/models/IntegrationCredential.ts` - Store encrypted OAuth tokens

#### 2. OAuth Routes
- [ ] `backend/src/routes/integrations/slack.ts` - Slack OAuth flow
- [ ] `backend/src/routes/integrations/googleSheets.ts` - Google Sheets OAuth flow
- [ ] `backend/src/routes/integrations/notion.ts` - Notion OAuth flow

#### 3. Field Fetching Service
- [ ] `backend/src/services/workflow/fieldFetcher.ts` - Fetch channels, users, spreadsheets, databases

#### 4. Validation Service
- [ ] `backend/src/services/workflow/connectionValidator.ts` - Validate node connections and credentials

#### 5. Action Executors
- [ ] `backend/src/services/workflow/actions/googleSheetsAction.ts` - Execute Google Sheets actions
- [ ] `backend/src/services/workflow/actions/notionAction.ts` - Execute Notion actions
- [ ] Update `backend/src/services/workflow/actions/slackAction.ts` - Update Slack executor

---

## Testing OAuth Flow

### Local Testing

1. Start backend server: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to workflow builder
4. Add Slack/Google Sheets/Notion integration node
5. Select an action (triggers OAuth permission calculation)
6. Click "Connect" button
7. OAuth popup should open
8. Authorize the app
9. Popup closes automatically
10. Configuration panel should update with "Connected" status

### Troubleshooting

**OAuth popup doesn't open:**
- Check browser popup blocker
- Verify redirect URI matches exactly (no trailing slash)
- Check backend logs for errors

**"Redirect URI mismatch" error:**
- Ensure redirect URI in app settings matches `.env` value
- Check for http vs https mismatch
- Verify port number is correct

**Tokens not saving:**
- Check encryption key is set: `ENCRYPTION_KEY` in `.env`
- Verify MongoDB connection
- Check backend logs for encryption errors

**"Invalid scopes" error:**
- Verify all required scopes are added to OAuth app
- For Google, check OAuth consent screen scopes
- For Slack, check Bot Token Scopes

---

## Security Best Practices

1. **Never commit credentials to git:**
   - Add `.env` to `.gitignore`
   - Use `.env.example` template without real values

2. **Use strong encryption:**
   - Generate secure `ENCRYPTION_KEY`: `openssl rand -base64 32`
   - Store in environment variables, not code

3. **HTTPS in production:**
   - Always use HTTPS for production redirect URIs
   - Enforce SSL/TLS on backend

4. **Token refresh:**
   - Implement automatic token refresh for expired tokens
   - Google tokens expire after 1 hour (refresh token valid for 6 months)
   - Slack tokens don't expire unless revoked

5. **Scope minimization:**
   - Only request scopes needed for specific actions
   - Use action-based scope requests in OAuth flow

---

## Environment Variables Template

Create `backend/.env` with:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/mrmorris

# Encryption
ENCRYPTION_KEY=your_32_byte_base64_encryption_key

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:4000/api/integrations/slack/oauth/callback

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/integrations/google-sheets/oauth/callback

# Notion OAuth
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:4000/api/integrations/notion/oauth/callback

# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

## Next Steps

1. ✅ Frontend integration configs updated with 3-step flow
2. ⏳ Create OAuth credentials for each service (follow steps above)
3. ⏳ Add environment variables to `backend/.env`
4. ⏳ Implement backend OAuth routes (from plan)
5. ⏳ Implement field fetching service (from plan)
6. ⏳ Test OAuth flow end-to-end

Refer to the plan in `~/.claude/plans/snoopy-tumbling-blanket.md` for detailed implementation steps for the backend components.
