# HTTPS Setup for Local Development

## Simple 3-Step Process

### Step 1: Install ngrok (One-time)

**Option A - Chocolatey (Recommended):**
```powershell
choco install ngrok
```

**Option B - Manual:**
1. Download from https://ngrok.com/download
2. Extract `ngrok.exe` to a folder
3. Add folder to PATH, or copy to `C:\Windows\System32`

**Authenticate ngrok:**
```bash
# Sign up at https://dashboard.ngrok.com/signup
# Get token from https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_TOKEN_HERE
```

---

### Step 2: Start Services

**Terminal 1 - Backend:**
```bash
cd C:\Users\imkum\SDE\Clianta\mrmorris-build\backend
npm run dev
```

Wait until you see:
```
🚀 Server is running
📍 Port: 5000
```

**Terminal 2 - ngrok:**
```bash
cd C:\Users\imkum\SDE\Clianta\mrmorris-build\backend
ngrok http 5000
```

You'll see:
```
Forwarding   https://xxxx-xx-xxx-xxx-xx.ngrok-free.app -> http://localhost:5000
```

**Copy the HTTPS URL** (the one starting with `https://`)

---

### Step 3: Update Configuration

**A. Update `.env` file:**

Open `C:\Users\imkum\SDE\Clianta\mrmorris-build\backend\.env`

Change:
```bash
BACKEND_URL=http://localhost:5000
```

To:
```bash
BACKEND_URL=https://xxxx-xx-xxx-xxx-xx.ngrok-free.app
```
(Use YOUR actual ngrok URL)

**B. Restart Backend:**

In Terminal 1:
- Press `Ctrl+C` to stop
- Run `npm run dev` again

**C. Update Slack App:**

1. Go to https://api.slack.com/apps
2. Click your app (Client ID: `9981887993252`)
3. Click **OAuth & Permissions** in sidebar
4. Under **Redirect URLs**, click **Add New Redirect URL**
5. Paste: `https://xxxx-xx-xxx-xxx-xx.ngrok-free.app/api/integrations/slack/oauth/callback`
   (Use YOUR actual ngrok URL + `/api/integrations/slack/oauth/callback`)
6. Click **Add**
7. Click **Save URLs**

---

### Step 4: Test

1. Go to your workflow builder: http://localhost:3000
2. Add Slack integration node
3. Click to configure
4. Click "Connect Slack"
5. Should open Slack OAuth page ✅

---

## Important Notes

⚠️ **ngrok URL changes** every time you restart ngrok (free plan)

When ngrok URL changes, you must:
1. Update `BACKEND_URL` in `.env`
2. Update Slack redirect URI
3. Restart backend

💡 **Keep both terminals running** while developing

🔄 **To stop:**
- Terminal 1: Press `Ctrl+C` (stops backend)
- Terminal 2: Press `Ctrl+C` (stops ngrok)

---

## Alternative: Skip Local HTTPS Testing

If ngrok is too much hassle for development:

1. **Test Slack integration only on production** (after deploying)
2. **For local development**, test other features without Slack
3. **Use production URL** in Slack app settings only:
   ```
   https://api.clianta.online/api/integrations/slack/oauth/callback
   ```

This way you don't need ngrok for local development!

---

## Troubleshooting

**"ngrok not found"**
- Make sure ngrok is in PATH
- Or run from the ngrok.exe folder

**"ERR_NGROK_108"**
- Your authtoken is invalid
- Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

**Slack redirect URI mismatch**
- Make sure `.env` BACKEND_URL exactly matches the URL in Slack app settings
- Include the full path: `/api/integrations/slack/oauth/callback`

**Port 5000 already in use**
- Kill the process: `taskkill /F /PID <PID>`
- Or change PORT in `.env` to 5001, and run `ngrok http 5001`
