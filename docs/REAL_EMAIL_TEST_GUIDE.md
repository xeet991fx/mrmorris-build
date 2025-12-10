# 📧 Real Email Workflow Test Guide

## 🎯 Goal
Create a workflow that sends an email to **gaffarsk273@gmail.com** after 1 minute when a contact is created.

**Gmail Account:**
- Email: gaffarcr273@gmail.com
- Password: Ags_op123@

---

## ⚠️ IMPORTANT: Gmail Setup First

Before creating the workflow, you MUST connect your Gmail account to the system.

### Step 1: Connect Gmail Account

1. **Go to Settings/Integrations in your app**
   - URL: `http://localhost:3000/projects/[your-project-id]/settings/integrations`

2. **Click "Connect Gmail" or "Add Email Account"**

3. **Enter credentials:**
   - Email: `gaffarcr273@gmail.com`
   - Password: `Ags_op123@`

4. **Enable "App Password" in Gmail (REQUIRED)**

   ⚠️ **Gmail blocks regular passwords for apps. You need an App Password:**

   **How to get Gmail App Password:**

   a. Go to: https://myaccount.google.com/security

   b. Enable **2-Step Verification** (if not already)

   c. Click **"App passwords"**

   d. Select:
      - App: "Mail"
      - Device: "Other (Custom name)" → Type: "Mr Morris CRM"

   e. Click **"Generate"**

   f. Copy the **16-character password** (example: `abcd efgh ijkl mnop`)

   g. **Use THIS password in your app** (not your regular password)

5. **Save the integration**

---

## 🔧 Step-by-Step Workflow Creation

### Step 1: Go to Workflows Page

```
http://localhost:3000/projects/[your-project-id]/workflows
```

### Step 2: Create New Workflow

1. Click **"Create Workflow"** button
2. Name: "Test Email After 1 Minute"
3. Entity Type: **Contact**
4. Click **"Create"**

### Step 3: Add Trigger Node

1. Canvas opens with empty workflow
2. Click **"Add Trigger"** or drag **Trigger node**
3. Configure:
   - **Trigger Type:** "Contact Created"
4. Click **"Save"**

### Step 4: Add Delay Node

1. Click **"Add Step"** → **"Delay"**
2. Position it below the trigger
3. Configure:
   - **Duration:** `1`
   - **Unit:** `minutes` ⚠️ (NOT days!)
4. Connect: Trigger → Delay (drag line)
5. Click **"Save"**

### Step 5: Add Email Action Node

1. Click **"Add Step"** → **"Action"**
2. Position it below the delay
3. Configure:
   - **Action Type:** "Send Email"
   - **Recipient:** Use contact's email (default) OR:
     - Check "Use custom email"
     - Enter: `gaffarsk273@gmail.com`
   - **Subject:** `Test Email - Workflow Working!`
   - **Body:**
     ```
     Hello {{firstName}}!

     This is a test email from your workflow automation system.

     If you're reading this, the workflow is working perfectly! 🎉

     Details:
     - Contact: {{firstName}} {{lastName}}
     - Email: {{email}}
     - Sent via: Mr Morris CRM Workflow

     Best regards,
     Your Automation System
     ```
   - **Send from Account:** Select `gaffarcr273@gmail.com`
4. Connect: Delay → Email Action (drag line)
5. Click **"Save"**

### Step 6: Save Workflow

1. Click **"Save Workflow"** (top right)
2. Wait for success message

### Step 7: Validate Workflow

1. Look for validation errors (red panel at bottom)
2. Should show: ✅ "No errors"
3. If errors exist, fix them before activating

### Step 8: Activate Workflow

1. Click **"Activate"** button (top right)
2. Status changes: Draft → **Active** ✅
3. Workflow is now listening for triggers!

---

## 🧪 Testing the Workflow

### Step 1: Create Test Contact

1. Go to **Contacts** page
   ```
   http://localhost:3000/projects/[your-project-id]/contacts
   ```

2. Click **"Add Contact"**

3. Fill in details:
   - **First Name:** "Test"
   - **Last Name:** "User"
   - **Email:** "gaffarsk273@gmail.com" ⚠️ (Your recipient email)
   - **Phone:** (optional)
   - **Company:** (optional)

4. Click **"Save Contact"**

### Step 2: Watch Server Console

**Immediately after saving contact:**

```bash
# You should see:
📥 POST /api/workspaces/.../contacts
✅ Contact created successfully
🔍 Found 1 active workflows for contact:created...
   ✅ Entity enrolled in workflow "Test Email After 1 Minute"
🔄 Processing 1 ready enrollments...
⏰ Delay step: Waiting 1 minutes (60000ms)
```

**Within next 60 seconds:**

```bash
# Scheduler checking every minute:
🔄 Processing 0 ready enrollments...  # (still waiting)
🔄 Processing 0 ready enrollments...  # (still waiting)
```

**After exactly 1 minute:**

```bash
🔄 Processing 1 ready enrollments...  # ← Delay done!
⚡ Executing action "send_email" for contact Test User...
📧 Sending email to gaffarsk273@gmail.com...
✅ Email sent successfully
✅ Step completed
🔄 Processing 0 ready enrollments...  # ← All done!
```

### Step 3: Check Your Email

1. Open Gmail: https://mail.google.com
2. Login to: **gaffarsk273@gmail.com**
3. Check **Inbox** (or Spam folder)
4. Should see email with subject: **"Test Email - Workflow Working!"**
5. Open it to verify content

---

## 📊 Monitoring Workflow Execution

### Option A: Server Console Logs

Keep your backend terminal open and watch for:
- 🔍 = Workflow found
- ⚡ = Action executing
- ⏰ = Delay active
- ✅ = Success
- ❌ = Error

### Option B: Workflow Analytics

1. Go to workflow page
2. Click **"Analytics"** tab
3. You'll see:
   ```
   Total Enrolled: 1
   Currently Active: 1 (during delay)
                  → 0 (after email sent)
   Completed: 1
   Failed: 0
   ```

### Option C: Enrollment Details

1. In workflow page, click **"Enrollments"** tab
2. You'll see list of enrollments:
   ```
   Contact: Test User
   Status: Active → Completed
   Steps Executed:
     ✓ Trigger: Contact Created
     ✓ Delay: Wait 1 minute
     ✓ Action: Send Email
   ```

---

## 🔍 Troubleshooting

### Issue 1: Email Not Sending

**Check Console for Error:**

```bash
❌ Failed to send email: Authentication failed
```

**Solutions:**

1. **Gmail App Password Required**
   - Regular password won't work
   - Generate App Password (see setup above)
   - Update integration with App Password

2. **"Less secure app access" Disabled**
   - Google disabled this in 2022
   - MUST use App Password instead

3. **2-Factor Authentication Not Enabled**
   - Required for App Passwords
   - Enable at: https://myaccount.google.com/security

4. **Wrong Email Integration Selected**
   - In email action config
   - Make sure "Send from Account" = `gaffarcr273@gmail.com`

### Issue 2: Workflow Not Triggering

**Console Shows:**
```bash
🔍 Found 0 active workflows for contact:created...
```

**Solutions:**

1. **Workflow Not Activated**
   - Status must be "Active" (not "Draft")
   - Click "Activate" button

2. **Wrong Trigger Type**
   - Must be "Contact Created"
   - Check trigger configuration

3. **Wrong Entity Type**
   - Workflow entity type must be "Contact"
   - Not "Deal" or "Company"

### Issue 3: Email Sent to Wrong Address

**Problem:** Email goes to contact's email, not gaffarsk273@gmail.com

**Solution:**

1. Edit email action
2. Check **"Use custom email"** ✅
3. Enter: `gaffarsk273@gmail.com`
4. Save workflow
5. Create new contact to test again

### Issue 4: Delay Not Working (Executes Immediately)

**Problem:** Email sent instantly, no 1-minute wait

**Cause:** Delay configured wrong

**Check:**
- Duration: `1`
- Unit: `minutes` (NOT `days` or `hours`)

### Issue 5: Stuck in "Active" Status

**Problem:** Enrollment shows "Active" forever

**Console Shows:**
```bash
🔄 Processing 0 ready enrollments...
```

**Solutions:**

1. **Check nextExecutionTime**
   - Might be set to future date
   - Wait until that time

2. **Scheduler Not Running**
   - Restart backend server
   - Check for scheduler startup logs

3. **Database Connection Lost**
   - Check MongoDB connection
   - Restart server

---

## 🎯 Expected Timeline

```
Time 00:00 → Create contact
Time 00:01 → Enrollment created (console shows enrollment)
Time 00:02 → Delay active (waiting...)
Time 00:03 → Still waiting...
...
Time 01:00 → Scheduler picks up enrollment
Time 01:01 → Email sent! ✅
Time 01:02 → Workflow completed
```

**Total time: ~1 minute from contact creation to email sent**

---

## 🎮 Alternative: Test Mode (Instant Results)

If you want to test WITHOUT waiting 1 minute:

### Option A: Test Mode

1. Open workflow in browser
2. Click **"Test Workflow"** button
3. Select the contact you created
4. **Uncheck "Fast Forward"** ❌ (to respect delays)
5. **Check "Dry Run"** ✅ (to simulate email)
6. Click **"Start Test"**

**Result:** See what would happen in < 1 second

### Option B: Use Test Mode with Real Email

1. Open workflow
2. Click **"Test Workflow"**
3. Select contact
4. **Uncheck "Dry Run"** ❌ (to actually send)
5. **Check "Fast Forward"** ✅ (to skip delay)
6. Click **"Start Test"**

**Result:** Email sent immediately!

---

## 📧 Email Configuration Summary

### Required Settings:

```yaml
Email Integration:
  Provider: Gmail
  Email: gaffarcr273@gmail.com
  Password: [16-character App Password]
  SMTP Server: smtp.gmail.com
  Port: 587
  Secure: true

Workflow Email Action:
  Action Type: Send Email
  Send From: gaffarcr273@gmail.com
  Send To: gaffarsk273@gmail.com (custom)
  Subject: Test Email - Workflow Working!
  Body: [Your message with {{placeholders}}]
```

---

## ✅ Success Checklist

Before testing:
- [ ] Gmail App Password generated
- [ ] Email integration connected in app
- [ ] Workflow created with correct steps
- [ ] Delay set to 1 minute (not 1 day!)
- [ ] Email action configured
- [ ] Send from account selected
- [ ] Workflow activated (status = "Active")

After creating contact:
- [ ] Console shows "Entity enrolled"
- [ ] Console shows "Delay step: Waiting 1 minutes"
- [ ] After 1 minute: Console shows "Executing action"
- [ ] Console shows "Email sent successfully"
- [ ] Email received in gaffarsk273@gmail.com inbox

---

## 🎉 What Success Looks Like

### Console Output:
```bash
📥 POST /api/workspaces/.../contacts
✅ Contact created successfully
🔍 Found 1 active workflows for contact:created in workspace ...
   ✅ Entity enrolled in workflow "Test Email After 1 Minute"

[Wait 1 minute...]

🔄 Processing 1 ready enrollments...
⚡ Executing action "send_email" for contact Test User
📧 Sending email from gaffarcr273@gmail.com to gaffarsk273@gmail.com
📧 Subject: Test Email - Workflow Working!
✅ Email sent via Gmail SMTP
✅ Step completed
✅ Enrollment completed
```

### Email Received:
```
From: gaffarcr273@gmail.com
To: gaffarsk273@gmail.com
Subject: Test Email - Workflow Working!

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

### Analytics Dashboard:
```
Workflow: Test Email After 1 Minute
Status: Active ✅

Stats:
- Total Enrolled: 1
- Currently Active: 0
- Completed: 1 ✅
- Failed: 0

Recent Enrollments:
✓ Test User - Completed 1 minute ago
```

---

## 🚀 Next Steps After Successful Test

1. **Try with longer delay**
   - Change to 5 minutes
   - Or 1 hour
   - See it execute at scheduled time

2. **Add branching logic**
   - Add condition: "Email opened?"
   - YES → Send follow-up
   - NO → Send reminder

3. **Use templates**
   - Try "Welcome New Contacts" template
   - Modify to use your email

4. **Test error handling**
   - Temporarily disconnect Gmail
   - See it retry 3 times
   - Check Failed Enrollments panel

---

## 📞 Need Help?

If something doesn't work:

1. **Check server console** for error messages
2. **Check Gmail App Password** is correct
3. **Verify workflow is "Active"** not "Draft"
4. **Check spam folder** for email
5. **Wait full 60 seconds** for delay to complete
6. **Check Failed Enrollments panel** for errors

---

**Ready to test? Let's go!** 🚀

1. ✅ Set up Gmail App Password
2. ✅ Connect Gmail integration
3. ✅ Create workflow (1 minute delay)
4. ✅ Activate workflow
5. ✅ Create contact
6. ✅ Wait 1 minute
7. ✅ Check email inbox!
