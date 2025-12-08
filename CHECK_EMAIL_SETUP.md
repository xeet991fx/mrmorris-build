# ⚡ Quick Email Setup Check

## 🎯 Before Testing Workflow

Run these checks to ensure email will work:

---

## Step 1: Generate Gmail App Password (CRITICAL!)

⚠️ **Regular Gmail password WILL NOT WORK for apps**

### How to Get App Password:

1. **Go to:** https://myaccount.google.com/security

2. **Enable 2-Step Verification** (if not already)
   - Click "2-Step Verification"
   - Follow setup wizard
   - Verify with phone

3. **Generate App Password:**
   - Go back to Security page
   - Click "App passwords" (near bottom)
   - Select:
     - **App:** Mail
     - **Device:** Other → Type "Mr Morris CRM"
   - Click **"Generate"**

4. **Copy the 16-character password:**
   ```
   Example: abcd efgh ijkl mnop
   ```

5. **SAVE THIS PASSWORD!** You'll need it in the app.

---

## Step 2: Check if Email Integration Exists

### Method A: Check via Browser UI

1. Go to: `http://localhost:3000/projects/[your-project-id]/settings`
2. Look for "Integrations" or "Email" section
3. Check if Gmail is connected

### Method B: Check via Database

```bash
# Connect to MongoDB
mongo your_database_name

# Or if using MongoDB Compass:
# Open Compass → Connect → Browse to your database

# Run query:
db.emailintegrations.find({
  email: "gaffarcr273@gmail.com"
}).pretty()

# Should return:
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "provider": "gmail",
  "email": "gaffarcr273@gmail.com",
  "accessToken": "...",
  "refreshToken": "...",
  "isActive": true
}
```

---

## Step 3: Test Email Sending Directly

### Create Test API Endpoint (Temporary)

Add this to `backend/src/routes/workflow.ts` for testing:

```typescript
// TEST ENDPOINT - Remove after testing
router.post(
    "/:workspaceId/test-email",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const nodemailer = require('nodemailer');

            // Create transporter
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'gaffarcr273@gmail.com',
                    pass: process.env.GMAIL_APP_PASSWORD || 'YOUR_APP_PASSWORD_HERE'
                }
            });

            // Send test email
            const info = await transporter.sendMail({
                from: 'gaffarcr273@gmail.com',
                to: 'gaffarsk273@gmail.com',
                subject: 'Test Email from Mr Morris CRM',
                text: 'If you receive this, email integration is working!',
                html: '<h1>Success!</h1><p>Email integration is working correctly.</p>'
            });

            res.json({
                success: true,
                message: 'Test email sent',
                messageId: info.messageId
            });
        } catch (error: any) {
            console.error('Test email error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);
```

### Call Test Endpoint:

```bash
curl -X POST "http://localhost:5000/api/workspaces/69207d0827fa7d997ed0ee3f/test-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Step 4: Add App Password to Environment

### Edit `.env` file:

```bash
# backend/.env

# Add this line:
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# Replace with your actual 16-character App Password
# Remove spaces: abcdefghijklmnop
```

### Restart Backend:

```bash
cd backend
npm run dev
```

---

## Step 5: Verify Workflow Email Action Configuration

### Check These Settings in Email Action:

```yaml
Email Action Configuration:
  ✓ Action Type: "Send Email"
  ✓ Send From Account: "gaffarcr273@gmail.com" (select from dropdown)
  ✓ Recipient:
      Option A: Use Contact Email (default)
      Option B: Custom Email → "gaffarsk273@gmail.com"
  ✓ Subject: Your test subject
  ✓ Body: Your test message
```

---

## 🔍 Common Email Issues & Solutions

### Issue 1: "Authentication failed"

**Error:**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution:**
- Using regular password instead of App Password
- Generate App Password from Google Account settings
- Use the 16-character code

---

### Issue 2: "Less secure app access"

**Error:**
```
Error: Please log in via your web browser and then try again.
```

**Solution:**
- Google disabled "Less secure apps" in May 2022
- MUST use App Password instead
- Cannot bypass this - it's a Google security requirement

---

### Issue 3: "No email integration found"

**Error:**
```
Error: No email account configured
```

**Solution:**
1. Go to app settings
2. Add Gmail integration
3. Connect with App Password
4. Select it in email action config

---

### Issue 4: Email goes to spam

**Not an error, but emails landing in spam folder**

**Solution:**
1. Check spam folder
2. Mark as "Not Spam"
3. Add sender to contacts
4. Future emails should go to inbox

---

## ✅ Pre-Flight Checklist

Before creating workflow:

- [ ] 2-Step Verification enabled on gaffarcr273@gmail.com
- [ ] App Password generated (16 characters)
- [ ] App Password saved in `.env` file
- [ ] Backend server restarted after adding password
- [ ] Email integration added in app UI
- [ ] Integration shows as "Connected" or "Active"
- [ ] Test email sent successfully (optional but recommended)

Ready to create workflow:

- [ ] Workflow entity type: "Contact"
- [ ] Trigger: "Contact Created"
- [ ] Delay: 1 minute (not 1 day!)
- [ ] Email action: "Send Email"
- [ ] Send from: "gaffarcr273@gmail.com"
- [ ] Send to: "gaffarsk273@gmail.com"
- [ ] Workflow status: "Active" (not "Draft")

---

## 🚀 Quick Test Command

Once everything is set up, test with this:

```bash
# Create a test contact via API
curl -X POST "http://localhost:5000/api/workspaces/69207d0827fa7d997ed0ee3f/contacts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "gaffarsk273@gmail.com",
    "phone": "1234567890"
  }'

# Watch server console for:
# 🔍 Found 1 active workflows...
# ⏰ Delay step: Waiting 1 minutes...
# (wait 60 seconds)
# ⚡ Executing action "send_email"...
# ✅ Email sent successfully
```

---

## 📧 Expected Email Result

**After 1 minute, check Gmail inbox:**

```
From: gaffarcr273@gmail.com
To: gaffarsk273@gmail.com
Subject: Test Email - Workflow Working!
Date: [Current date/time]

Hello Test!

This is a test email from your workflow automation system.
If you're reading this, the workflow is working perfectly! 🎉

Details:
- Contact: Test User
- Email: gaffarsk273@gmail.com
- Sent via: Mr Morris CRM Workflow

Best regards,
Your Automation System
```

---

## 🎯 Next Steps

1. ✅ Complete this checklist
2. ✅ Follow `REAL_EMAIL_TEST_GUIDE.md`
3. ✅ Create workflow with 1 minute delay
4. ✅ Create test contact
5. ✅ Wait 1 minute
6. ✅ Receive email! 🎉

---

**Any issues? Check server console logs for specific error messages.**
