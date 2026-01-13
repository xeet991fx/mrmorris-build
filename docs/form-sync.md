# Form Google Sheets Sync

> Automatically sync form submissions to Google Sheets in real-time or batch mode.

## Overview

The Form Google Sheets Sync feature allows users to automatically export form submissions to a Google Spreadsheet. This enables teams to:

- Track leads in familiar spreadsheet format
- Share submission data with non-CRM users
- Create custom reports and dashboards in Google Sheets
- Integrate with other tools via Google Sheets automation

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUBMISSION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

User Fills Form
      │
      ▼
POST /api/public/forms/:formId/submit
      │
      ▼
┌─────────────────────────────────────────┐
│         Form Submission Created          │
│    (FormSubmission model saved to DB)    │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│     Check: Google Sheets Enabled?        │
└─────────────────────────────────────────┘
      │
      ├── NO ──▶ Skip sync
      │
      └── YES
            │
            ▼
      ┌─────────────────────────────────────────┐
      │         Check: Sync Mode?               │
      └─────────────────────────────────────────┘
            │
            ├── REALTIME ──────────────────────────────────┐
            │                                              │
            │   ┌──────────────────────────────────────┐   │
            │   │   Async: syncFormSubmission()        │   │
            │   │   - Get Google OAuth credentials     │   │
            │   │   - Ensure sheet & headers exist     │   │
            │   │   - Append row to Google Sheet       │   │
            │   │   - Update submission sync status    │   │
            │   └──────────────────────────────────────┘   │
            │                                              │
            └── BATCH ─────────────────────────────────────┤
                  │                                        │
                  │   Mark submission for batch sync       │
                  │   (googleSheetSync.synced = false)     │
                  │                                        │
                  ▼                                        ▼
      ┌───────────────────────────────┐      ┌────────────────────────────┐
      │   Hourly Background Job       │      │   Return submission         │
      │   batchSyncSubmissions()      │      │   response to user          │
      │   - Find unsynced submissions │      └────────────────────────────┘
      │   - Batch append to Sheet     │
      │   - Update sync statuses      │
      └───────────────────────────────┘
```

## Data Models

### Form Model Extension

```typescript
// backend/src/models/Form.ts

googleSheetsIntegration?: {
    enabled: boolean;           // Toggle sync on/off
    spreadsheetId: string;      // Google Sheet ID
    sheetName: string;          // Tab name (default: "Form Submissions")
    syncMode: 'realtime' | 'batch';  // Sync immediately or hourly
    credentialId: string;       // Reference to IntegrationCredential
    lastSyncAt?: Date;          // Last successful sync timestamp
    syncStats?: {
        totalSynced: number;    // Total rows synced
        failedSyncs: number;    // Failed sync count
    };
};
```

### FormSubmission Model Extension

```typescript
// backend/src/models/FormSubmission.ts

googleSheetSync?: {
    synced: boolean;            // Has been synced?
    syncedAt?: Date;            // When was it synced?
    spreadsheetId?: string;     // Which spreadsheet?
    sheetName?: string;         // Which sheet tab?
    error?: string;             // Error message if failed
};
```

## API Endpoints

### OAuth Flow

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/google_sheets/oauth/authorize` | Initiate OAuth flow |
| GET | `/api/integrations/google_sheets/oauth/callback` | OAuth callback handler |
| POST | `/api/integrations/google_sheets/refresh_token` | Refresh access token |

### Spreadsheet Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/google_sheets/spreadsheets` | List user's spreadsheets |
| GET | `/api/integrations/google_sheets/sheets` | List sheets in a spreadsheet |

### Form Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/integrations/google_sheets/forms/:formId/config` | Update sync config |
| GET | `/api/integrations/google_sheets/forms/:formId/sync-status` | Get sync status |
| POST | `/api/integrations/google_sheets/forms/:formId/sync` | Trigger manual sync |

## Services

### FormGoogleSheetSync Service

Location: `backend/src/services/FormGoogleSheetSync.ts`

#### Functions

| Function | Description |
|----------|-------------|
| `syncFormSubmission()` | Sync a single submission to Google Sheets (real-time mode) |
| `batchSyncSubmissions()` | Sync all unsynced submissions for a form (batch mode) |
| `getUserSpreadsheets()` | List user's Google Spreadsheets via Drive API |
| `getSpreadsheetSheets()` | Get sheet tabs from a specific spreadsheet |
| `getFormSyncStatus()` | Get sync statistics for a form |

#### Helper Functions

| Function | Description |
|----------|-------------|
| `getGoogleSheetsClient()` | Get authenticated Sheets API client |
| `ensureSheetHeaders()` | Create sheet and headers if they don't exist |
| `formatSubmissionAsRow()` | Convert submission data to spreadsheet row |

## Background Job

### Google Sheet Form Sync Job

Location: `backend/src/jobs/googleSheetFormSyncJob.ts`

**Schedule:** Runs every hour at minute 0 (`0 * * * *`)

**Behavior:**
1. Find all forms with `syncMode: 'batch'` enabled
2. For each form, find unsynced submissions (max 100 per batch)
3. Batch append rows to Google Sheets
4. Update submission sync statuses
5. Update form sync statistics

**Manual Trigger:**
```typescript
import { triggerFormSync } from './jobs/googleSheetFormSyncJob';

await triggerFormSync(formId);
```

> ⚠️ **Note:** Background jobs are currently disabled due to Redis rate limits. Enable in `server.ts` when Redis is available.

## Frontend Components

### GoogleSheetsFormIntegration Component

Location: `frontend/components/forms/GoogleSheetsFormIntegration.tsx`

**Features:**
- Enable/disable toggle
- Google account connection (OAuth popup)
- Spreadsheet selection dropdown
- Sheet tab name input
- Sync mode selection (Real-time vs Batch)
- Sync status dashboard
- Manual "Sync Now" button

**Props:**
```typescript
interface GoogleSheetsFormIntegrationProps {
    workspaceId: string;
    formId: string;
    config?: GoogleSheetsIntegrationConfig;
    onConfigChange: (config: GoogleSheetsIntegrationConfig) => void;
}
```

## Google Sheet Format

When syncing to Google Sheets, the following format is used:

### Headers (Row 1)
| Submission Date | Contact ID | [Field 1 Label] | [Field 2 Label] | ... |
|-----------------|------------|-----------------|-----------------|-----|

### Data Rows
| ISO Timestamp | MongoDB ObjectId | Field 1 Value | Field 2 Value | ... |

### Styling
- Header row: Bold text, blue background (#3380CC), white text
- Header row frozen (always visible when scrolling)
- Data entered as "USER_ENTERED" (Google auto-formats dates, numbers, etc.)

## Configuration

### Environment Variables

```env
# Google OAuth (required)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/integrations/google_sheets/oauth/callback
```

### Google Cloud Console Setup

1. Create a project in Google Cloud Console
2. Enable these APIs:
   - Google Sheets API
   - Google Drive API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI
5. Add necessary scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.readonly`

## Usage

### 1. Connect Google Account

1. Go to Form Builder → Integrations tab
2. Enable Google Sheets Integration
3. Click "Connect Google Account"
4. Authorize access in popup

### 2. Configure Sync

1. Select a spreadsheet from the dropdown
2. Enter sheet tab name (default: "Form Submissions")
3. Choose sync mode:
   - **Real-time**: Syncs immediately on each submission
   - **Batch**: Syncs every hour in batches
4. Save the form

### 3. Monitor Sync Status

The sync status panel shows:
- Total synced submissions
- Pending sync count
- Failed sync count
- Last sync timestamp

Use "Sync Now" to manually trigger sync.

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to authenticate" | OAuth token expired | Reconnect Google account |
| "Spreadsheet not found" | Sheet was deleted | Select a different spreadsheet |
| "Permission denied" | Sharing changed | Re-authorize or request access |
| "Quota exceeded" | Too many API calls | Wait and retry later |

### Retry Logic

- Failed real-time syncs are marked with error in submission
- Manual "Sync Now" will retry all failed submissions
- Batch job automatically retries on next run

## Limitations

1. **Maximum 100 submissions per batch** - Prevents timeouts
2. **Rate limits** - Google Sheets API has usage limits
3. **Column limit** - Google Sheets supports 26,000 columns max
4. **Row limit** - Google Sheets supports 10 million cells per sheet

## Files Changed

### Backend
- `src/services/FormGoogleSheetSync.ts` - New service
- `src/jobs/googleSheetFormSyncJob.ts` - New background job
- `src/models/Form.ts` - Added googleSheetsIntegration field
- `src/models/FormSubmission.ts` - Added googleSheetSync field
- `src/routes/integrations/googleSheets.ts` - New API endpoints
- `src/routes/publicForm.ts` - Hook into submission flow
- `src/server.ts` - Import new job

### Frontend
- `components/forms/GoogleSheetsFormIntegration.tsx` - New component
- `app/projects/[id]/forms/[formId]/edit/page.tsx` - Updated integrations tab

---

*Last updated: January 2026*
