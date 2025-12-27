# Production Deployment Guide

**Last Updated:** December 27, 2025

This guide walks you through deploying MorrisB to production.

---

## 🎯 Prerequisites

Before deploying, ensure you have:
- [ ] MongoDB Atlas account (or MongoDB server)
- [ ] Domain name (e.g., `yourcompany.com`)
- [ ] Email service (Gmail, Resend, or SMTP)
- [ ] Hosting platform (Vercel, Railway, AWS, etc.)

---

## 📝 Step 1: Environment Variables

### Backend (.env)

Create `backend/.env` with these production values:

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=5000
NODE_ENV=production

# Your production domains
BACKEND_URL=https://api.yourcompany.com
FRONTEND_URL=https://app.yourcompany.com

# ============================================
# DATABASE
# ============================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/morrisb?retryWrites=true&w=majority

# ============================================
# SECURITY
# ============================================
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long
JWT_EXPIRE=7d

# ============================================
# EMAIL SERVICE
# ============================================
# Option 1: Resend (Recommended for production)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourcompany.com
EMAIL_FROM_NAME=Your Company

# Option 2: Gmail (for development/small scale)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=465
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
# EMAIL_FROM_NAME=Your Company

# ============================================
# GOOGLE OAUTH
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ============================================
# AI SERVICES
# ============================================
# Anthropic (Claude) - Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI (GPT) - Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Gemini - Get from: https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# APOLLO.IO (Contact Enrichment)
# ============================================
APOLLO_API_KEY=your-apollo-api-key

# ============================================
# OPTIONAL SERVICES
# ============================================
# Sentry (Error tracking)
# SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Redis (for caching - optional)
# REDIS_URL=redis://localhost:6379
```

### Frontend (.env.local)

Create `frontend/.env.local` with these production values:

```bash
# ============================================
# API URLS
# ============================================
# Backend API URL (where your backend is hosted)
NEXT_PUBLIC_API_URL=https://api.yourcompany.com

# Backend URL for tracking script
NEXT_PUBLIC_BACKEND_URL=https://api.yourcompany.com

# Frontend App URL (where your frontend is hosted)
NEXT_PUBLIC_APP_URL=https://app.yourcompany.com
```

---

## 🚀 Step 2: Domain Setup

### Recommended Domain Structure

```
yourcompany.com          → Marketing site (optional)
app.yourcompany.com      → Frontend (Next.js)
api.yourcompany.com      → Backend (Node.js/Express)
```

### DNS Configuration

Add these DNS records:

| Type  | Name | Value |
|-------|------|-------|
| A     | app  | [Your Frontend Server IP] |
| A     | api  | [Your Backend Server IP] |
| CNAME | www  | yourcompany.com |

---

## 🔧 Step 3: Backend Deployment

### Option A: Railway (Recommended - Easy)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Deploy backend:**
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Add environment variables:**
   - Go to Railway dashboard
   - Select your project
   - Go to Variables
   - Copy all variables from `.env` file above

5. **Get your backend URL:**
   - Railway will provide a URL like: `your-project.up.railway.app`
   - Add custom domain: `api.yourcompany.com`

### Option B: Vercel

```bash
cd backend
vercel
```

Follow prompts and add environment variables in Vercel dashboard.

### Option C: AWS/Digital Ocean/VPS

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Clone repo:**
   ```bash
   git clone https://github.com/your-repo/morrisb.git
   cd morrisb/backend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create .env file:**
   ```bash
   nano .env
   # Paste your production env variables
   ```

5. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

6. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name morrisb-backend
   pm2 save
   pm2 startup
   ```

7. **Setup Nginx as reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.yourcompany.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Get SSL certificate:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourcompany.com
   ```

---

## 🎨 Step 4: Frontend Deployment

### Option A: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

3. **Add environment variables:**
   - Go to Vercel dashboard
   - Project Settings → Environment Variables
   - Add all variables from `.env.local` above

4. **Add custom domain:**
   - Project Settings → Domains
   - Add `app.yourcompany.com`

### Option B: Netlify

1. **Build the app:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

3. **Add environment variables in Netlify dashboard**

### Option C: Self-Hosted

1. **Build the app:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start with PM2:**
   ```bash
   pm2 start npm --name "morrisb-frontend" -- start
   ```

3. **Setup Nginx:**
   ```nginx
   server {
       listen 80;
       server_name app.yourcompany.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Get SSL:**
   ```bash
   sudo certbot --nginx -d app.yourcompany.com
   ```

---

## 🔐 Step 5: Security Checklist

### Backend Security

- [ ] **Change JWT secret** - Generate new one:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] **Enable CORS properly** - Update in `backend/src/server.ts`:
  ```typescript
  app.use(cors({
    origin: [
      'https://app.yourcompany.com',
      'https://yourcompany.com'
    ],
    credentials: true
  }));
  ```

- [ ] **Use HTTPS only** - Enforce SSL

- [ ] **Secure MongoDB** - Use strong password, enable IP whitelist

- [ ] **Environment variables** - Never commit `.env` files

- [ ] **Rate limiting** - Already configured in code

### Frontend Security

- [ ] **Secure cookies** - Use `secure` and `httpOnly` flags

- [ ] **Content Security Policy** - Add to `next.config.js`

- [ ] **Hide API keys** - All use `NEXT_PUBLIC_` prefix correctly

---

## 📧 Step 6: Email Service Setup

### Option A: Resend (Recommended)

1. **Sign up:** https://resend.com
2. **Get API key**
3. **Add to backend .env:**
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=noreply@yourcompany.com
   ```

### Option B: Gmail (Development/Small Scale)

1. **Enable 2FA** on your Gmail account
2. **Generate App Password:** https://myaccount.google.com/apppasswords
3. **Add to backend .env:**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=465
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

---

## 🧪 Step 7: Testing

### Test Backend

```bash
# Check health endpoint
curl https://api.yourcompany.com/health

# Should return: {"status":"ok"}
```

### Test Frontend

1. Visit: `https://app.yourcompany.com`
2. Create account
3. Login
4. Create a workspace

### Test Lead Generation

1. **Test Tracking Script:**
   - Create a simple HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Test Tracking</title>
     <script src="https://api.yourcompany.com/track.js"></script>
     <script>
       morrisb('YOUR_WORKSPACE_ID');
     </script>
   </head>
   <body>
     <h1>Test Page</h1>
     <button onclick="alert('Clicked!')">Click Me</button>
   </body>
   </html>
   ```
   - Open in browser
   - Check browser console for tracking events
   - Check MorrisB dashboard for visitor

2. **Test Form Submission:**
   - Create a form in MorrisB
   - Enable "Auto-create contact"
   - Submit the form
   - Check if contact was created
   - Check if notification email was received

3. **Test Email Integration:**
   - Connect Gmail account
   - Send/receive test email
   - Check if contacts are extracted

---

## 🔧 Step 8: Update Hardcoded URLs (if self-hosting with custom domain)

### If Your Domain is NOT `morrisb.com`

You'll need to update these files:

1. **Tracking Script:** `frontend/public/track.js`
   ```javascript
   // Line 10-12
   const API_ENDPOINT = window.location.hostname.includes('localhost')
     ? 'http://localhost:5000'
     : 'https://api.YOUR-DOMAIN.com'; // ← Change this
   ```

2. **Form Embed Script:** `frontend/public/forms/embed.js`
   ```javascript
   // Line 14-16
   const API_BASE_URL = window.location.hostname.includes('localhost')
     ? 'http://localhost:3000'
     : 'https://app.YOUR-DOMAIN.com'; // ← Change this

   // Line 18-20
   const BACKEND_URL = window.location.hostname.includes('localhost')
     ? 'http://localhost:5000'
     : 'https://api.YOUR-DOMAIN.com'; // ← Change this
   ```

3. **WordPress Plugin:** `integrations/wordpress/morrisb-tracking/morrisb-tracking.php`
   ```php
   // Line 138
   : 'https://app.YOUR-DOMAIN.com/track.js'; // ← Change this
   ```

---

## 📊 Step 9: Monitoring & Maintenance

### Setup Error Tracking (Optional but Recommended)

1. **Sign up for Sentry:** https://sentry.io
2. **Get DSN**
3. **Add to backend .env:**
   ```bash
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

### Setup Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor these URLs:
- `https://api.yourcompany.com/health`
- `https://app.yourcompany.com`

### Backup Strategy

1. **Database backups:**
   - MongoDB Atlas: Automatic backups enabled by default
   - Self-hosted: Setup cron job:
   ```bash
   # Backup script
   #!/bin/bash
   mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

   # Add to crontab (daily at 2 AM)
   0 2 * * * /path/to/backup.sh
   ```

2. **Code backups:**
   - Push to Git regularly
   - Tag releases: `git tag v1.0.0`

---

## ✅ Post-Deployment Checklist

### Day 1: Launch
- [ ] All environment variables set
- [ ] DNS records configured
- [ ] SSL certificates installed
- [ ] Backend health check passing
- [ ] Frontend loading correctly
- [ ] Can create account and login
- [ ] Email service working
- [ ] Tracking script loading
- [ ] Form submissions working

### Week 1: Monitoring
- [ ] Check error logs daily
- [ ] Monitor API response times
- [ ] Check email delivery rates
- [ ] Review visitor tracking data
- [ ] Test all lead generation features

### Month 1: Optimization
- [ ] Review performance metrics
- [ ] Optimize slow queries
- [ ] Add caching if needed
- [ ] Scale servers if needed
- [ ] Gather user feedback

---

## 🆘 Troubleshooting

### Issue: Tracking Script Not Loading

**Symptoms:** Console error: `Failed to load resource: track.js`

**Solutions:**
1. Check CORS headers on backend
2. Verify `BACKEND_URL` in frontend .env
3. Check if backend is running: `curl https://api.yourcompany.com/track.js`

### Issue: Forms Not Creating Contacts

**Symptoms:** Form submits but no contact created

**Solutions:**
1. Check backend logs for errors
2. Verify MongoDB connection
3. Check if "Auto-create contact" is enabled in form settings
4. Test API directly:
   ```bash
   curl -X POST https://api.yourcompany.com/api/public/forms/FORM_ID/submit \
     -H "Content-Type: application/json" \
     -d '{"data":{"email":"test@test.com","name":"Test"}}'
   ```

### Issue: Email Notifications Not Sending

**Symptoms:** Form submitted but no email received

**Solutions:**
1. Check backend logs
2. Verify email service credentials
3. Test email service:
   ```bash
   # From backend directory
   node -e "
   const emailService = require('./dist/services/email').default;
   emailService.sendFormNotificationEmail(
     'your-email@gmail.com',
     'Test Form',
     {email: 'test@test.com', name: 'Test User'},
     'test123'
   ).then(() => console.log('Email sent!')).catch(console.error);
   "
   ```
4. Check spam folder

### Issue: Can't Login/Register

**Symptoms:** Login fails or returns error

**Solutions:**
1. Check if backend is running
2. Verify JWT_SECRET is set
3. Check MongoDB connection
4. Clear browser cookies
5. Check browser console for errors

---

## 🎉 You're Done!

Your MorrisB CRM is now live and ready to generate leads!

**Next Steps:**
1. Set up your first form
2. Add tracking to your website
3. Connect your Gmail
4. Create welcome email sequence
5. Start capturing leads!

**Need Help?**
- Check logs: `pm2 logs` (if using PM2)
- Review documentation: `/DOCUMENTATION_INDEX.md`
- Check GitHub issues

---

## 📚 Quick Reference

### Important URLs
- Frontend: `https://app.yourcompany.com`
- Backend API: `https://api.yourcompany.com`
- API Health: `https://api.yourcompany.com/health`
- Tracking Script: `https://api.yourcompany.com/track.js`
- Form Embed: `https://api.yourcompany.com/forms/embed.js`

### Important Commands

**Backend:**
```bash
# Development
npm run dev

# Production
npm run build
npm start

# With PM2
pm2 start dist/server.js --name morrisb-backend
pm2 logs morrisb-backend
pm2 restart morrisb-backend
```

**Frontend:**
```bash
# Development
npm run dev

# Production
npm run build
npm start

# With PM2
pm2 start npm --name morrisb-frontend -- start
```

---

**Congratulations on deploying MorrisB!** 🚀
