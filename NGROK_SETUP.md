# ngrok Setup for Local HTTPS Development

## Quick Setup (5 minutes)

### Step 1: Install ngrok

**Option A - Using Chocolatey (Recommended):**
```bash
choco install ngrok
```

**Option B - Manual Download:**
1. Go to https://ngrok.com/download
2. Download the Windows version
3. Extract `ngrok.exe` to `C:\Windows\System32` (or add to PATH)

### Step 2: Sign Up & Get Auth Token

1. Create free account at https://dashboard.ngrok.com/signup
2. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

### Step 3: Start ngrok Tunnel

Open a new terminal and run:
```bash
ngrok http 5000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5000
```

### Step 4: Update .env File

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`) and update your `.env`:

```bash
# Development with ngrok
BACKEND_URL=https://abc123.ngrok-free.app
FRONTEND_URL=http://localhost:3000
```

### Step 5: Update Slack App

1. Go to https://api.slack.com/apps
2. Select your app
3. Go to **OAuth & Permissions** → **Redirect URLs**
4. Add: `https://abc123.ngrok-free.app/api/integrations/slack/oauth/callback`
5. Click **Save URLs**

### Step 6: Restart Backend

```bash
# Kill current backend
# Restart will automatically use new BACKEND_URL from .env
npm run dev
```

## Important Notes

⚠️ **ngrok URL Changes**: Free ngrok URLs change every time you restart ngrok. Update `.env` and Slack redirect URI each time.

💡 **Permanent URL**: Upgrade to ngrok paid plan for a permanent subdomain (optional)

🔄 **Keep Running**: Keep both terminals open:
- Terminal 1: `npm run dev` (backend on port 5000)
- Terminal 2: `ngrok http 5000` (tunnel to HTTPS)

## Troubleshooting

**"ngrok not found"**: Make sure ngrok.exe is in your PATH or run from the ngrok directory

**"ERR_NGROK_108"**: Your authtoken is invalid. Re-run `ngrok config add-authtoken`

**Slack redirect URI error**: Make sure the ngrok URL in `.env` matches exactly what's in Slack app settings

## Alternative: Production-Only Approach

If you don't want ngrok for development:
1. Use `http://localhost:5000` for local testing
2. Deploy to production with HTTPS
3. Only configure Slack OAuth on production

Just update Slack app settings:
- Development: Skip Slack integration testing
- Production: `https://api.clianta.online/api/integrations/slack/oauth/callback`
