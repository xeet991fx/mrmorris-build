# Clianta - Environment Configuration

## Overview

Clianta uses environment variables for configuration across frontend and backend. This document catalogs all environment variables, their purposes, and setup instructions.

**Configuration Files**:
- Backend: `backend/.env`
- Frontend: `frontend/.env.local`
- Root: `.env` (minimal, for monorepo scripts only)

---

## 1. Backend Environment Variables (`backend/.env`)

### Server Configuration

```env
# Server
PORT=5000
NODE_ENV=development|production
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

- **PORT**: Express server port (default: 5000)
- **NODE_ENV**: Environment mode (`development` or `production`)
- **FRONTEND_URL**: Frontend URL for CORS whitelist
- **BACKEND_URL**: Backend URL for OAuth callbacks

---

### Database Configuration

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/clianta
# OR for MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/clianta?retryWrites=true&w=majority
```

**Local Development**:
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Connection string
MONGODB_URI=mongodb://localhost:27017/clianta
```

**Production (MongoDB Atlas)**:
1. Create cluster at https://cloud.mongodb.com
2. Create database user
3. Whitelist IP addresses (or 0.0.0.0/0 for cloud deployments)
4. Copy connection string

---

### Redis Configuration

```env
# Option 1: REDIS_URL (Upstash, Railway, Heroku)
REDIS_URL=redis://localhost:6379
# OR for Upstash (with TLS)
REDIS_URL=rediss://default:password@host:port

# Option 2: Individual parameters (local development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Local Development**:
```bash
# Install Redis or use Docker
docker run -d -p 6379:6379 --name redis redis:latest

# Connection
REDIS_URL=redis://localhost:6379
```

**Production (Upstash)**:
1. Create database at https://upstash.com
2. Copy `REDIS_URL` (starts with `rediss://` for TLS)
3. Paste into `.env`

---

### Authentication

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-use-a-long-random-string
JWT_EXPIRE=7d

# Session
SESSION_SECRET=another-long-random-secret-for-sessions
```

**Security**:
- Use long, random strings (32+ characters)
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- NEVER commit secrets to git

---

### Google Cloud / AI

```env
# Google Vertex AI
GOOGLE_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Option 1: Local development (file path)
GOOGLE_APPLICATION_CREDENTIALS=./vertex-key.json

# Option 2: Production (base64 encoded)
GOOGLE_CREDENTIALS_BASE64=base64_encoded_service_account_json
```

**Setup**:
1. Create GCP project at https://console.cloud.google.com
2. Enable Vertex AI API
3. Create service account with "Vertex AI User" role
4. Download JSON key
5. **Local**: Save as `backend/vertex-key.json`
6. **Production**: Base64 encode: `cat vertex-key.json | base64 -w 0`

**Gemini API** (Alternative to Vertex AI):
```env
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio
```
Get key from: https://aistudio.google.com/app/apikey

---

### Email Services

```env
# Resend (Transactional emails)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@clianta.online

# Nodemailer (Alternative/SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=Clianta
```

**Resend Setup**:
1. Sign up at https://resend.com
2. Add and verify domain
3. Generate API key

---

### OAuth Integrations

```env
# Google OAuth (Gmail, Calendar, Sheets)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx

# Redirect URI (for OAuth consent screen)
# Local: http://localhost:5000/api/auth/google/callback
# Prod: https://api.clianta.online/api/auth/google/callback
```

**Setup**:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs
4. Copy Client ID + Secret

---

### Integration API Keys

```env
# Apollo.io (Contact enrichment)
APOLLO_API_KEY=your-apollo-api-key
APOLLO_BASE_URL=https://api.apollo.io/v1

# Twilio (SMS/Voice)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Slack (Notifications)
SLACK_CLIENT_ID=xxxx.xxxx
SLACK_CLIENT_SECRET=xxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxx
```

---

### Optional Services

```env
# Sentry (Error tracking)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# OpenAI (Future/alternative AI)
OPENAI_API_KEY=sk-xxxxxxxx

# Anthropic Claude (Future)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# Tavily (Web search for AI agents)
TAVILY_API_KEY=tvly-xxxxxxxx
```

---

### Queue Configuration

```env
# BullMQ Workers (Upstash optimization)
QUEUE_CONCURRENCY=3          # Jobs processed simultaneously
QUEUE_MAX_JOBS_PER_SECOND=5  # Rate limit for Upstash free tier
```

**Production Settings** (with larger Redis):
```env
QUEUE_CONCURRENCY=10
QUEUE_MAX_JOBS_PER_SECOND=20
```

---

### Encryption

```env
# For encrypting integration credentials
ENCRYPTION_KEY=32_character_random_string_here_abcdefghijklmnopqrstuvwxyz
```

**Generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Frontend Environment Variables (`frontend/.env.local`)

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# App URL (for tracking script)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production**:
```env
NEXT_PUBLIC_API_URL=https://api.clianta.online/api
NEXT_PUBLIC_APP_URL=https://clianta.online
```

**Important**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## 3. Environment File Templates

### Backend `.env` Template

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/clianta

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_STRING
JWT_EXPIRE=7d
SESSION_SECRET=CHANGE_THIS_TO_ANOTHER_LONG_RANDOM_STRING

# Google Cloud
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./vertex-key.json

# AI API Keys
GEMINI_API_KEY=your-gemini-api-key

# Email
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@clianta.online

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Integrations
APOLLO_API_KEY=your-apollo-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Optional
SENTRY_DSN=
ENCRYPTION_KEY=GENERATE_32_CHARACTER_RANDOM_STRING

# Queue
QUEUE_CONCURRENCY=3
QUEUE_MAX_JOBS_PER_SECOND=5
```

### Frontend `.env.local` Template

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Security Best Practices

### DO
✅ Use strong, random secrets (32+ characters)
✅ Different secrets for JWT_SECRET and SESSION_SECRET
✅ Add `.env` to `.gitignore` (already configured)
✅ Rotate secrets periodically in production
✅ Use environment-specific values (dev vs prod)
✅ Encrypt sensitive credentials (OAuth tokens, API keys)

### DON'T
❌ Commit `.env` files to git
❌ Use weak/predictable secrets
❌ Share secrets in Slack/email
❌ Reuse secrets across environments
❌ Hard-code secrets in source code

---

## 5. Environment Setup Guide

### Local Development

1. **Copy template files**:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

2. **Set up MongoDB**:
   - Install locally OR use Docker
   - Update `MONGODB_URI` in `backend/.env`

3. **Set up Redis**:
   - Install locally OR use Docker
   - Update `REDIS_URL` in `backend/.env`

4. **Generate secrets**:
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **Set up Google Cloud** (for AI features):
   - Create GCP project
   - Enable Vertex AI API
   - Download service account JSON → save as `backend/vertex-key.json`

6. **Optional integrations**: Add API keys as needed

---

### Production Deployment

1. **Set environment variables** in deployment platform (Railway, Vercel, etc.)

2. **Database URLs**:
   - Use MongoDB Atlas connection string
   - Use Upstash Redis URL (with TLS: `rediss://`)

3. **Google Credentials** (Production method):
```bash
# Base64 encode service account JSON
cat vertex-key.json | base64 -w 0

# Set GOOGLE_CREDENTIALS_BASE64 environment variable
```

4. **Update FRONTEND_URL and BACKEND_URL**:
```env
FRONTEND_URL=https://clianta.online
BACKEND_URL=https://api.clianta.online
```

5. **OAuth Redirect URIs**: Update in Google Cloud Console to production URLs

---

## 6. Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerError: bad auth`
**Solution**: Check username/password in connection string

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`
**Solution**: MongoDB not running. Start with `mongod` or `docker start mongodb`

**Error**: `IP not whitelisted` (Atlas)
**Solution**: Add IP to Atlas Network Access (or use 0.0.0.0/0 for cloud deployments)

---

### Redis Connection Issues

**Error**: `Redis connection failed: ECONNREFUSED`
**Solution**: Redis not running. Start with `redis-server` or `docker start redis`

**Error**: `WRONGPASS invalid username-password pair`
**Solution**: Check `REDIS_PASSWORD` or remove if no password set

**Upstash**: Use `rediss://` (with 's') for TLS connection

---

### Google Vertex AI Issues

**Error**: `Could not load the default credentials`
**Solution**:
- Local: Ensure `vertex-key.json` exists
- Production: Set `GOOGLE_CREDENTIALS_BASE64` correctly

**Error**: `Vertex AI API has not been enabled`
**Solution**: Enable at https://console.cloud.google.com/apis/library/aiplatform.googleapis.com

---

## 7. Environment Variable Checklist

### Required for Basic Functionality
- [ ] `MONGODB_URI` (database)
- [ ] `JWT_SECRET` (authentication)
- [ ] `SESSION_SECRET` (sessions)
- [ ] `FRONTEND_URL` (CORS)
- [ ] `BACKEND_URL` (OAuth callbacks)

### Required for AI Features
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CREDENTIALS_BASE64`
- [ ] `GOOGLE_PROJECT_ID`
- [ ] `GEMINI_API_KEY` (alternative to Vertex AI)

### Required for Email
- [ ] `RESEND_API_KEY` or `EMAIL_HOST`/`EMAIL_USER`/`EMAIL_PASS`

### Optional but Recommended
- [ ] `REDIS_URL` (caching, queues, sessions)
- [ ] `SENTRY_DSN` (error tracking)
- [ ] `ENCRYPTION_KEY` (credential encryption)

### Integration-Specific
- [ ] `APOLLO_API_KEY` (contact enrichment)
- [ ] `TWILIO_*` (SMS/voice)
- [ ] `GOOGLE_CLIENT_ID`/`SECRET` (OAuth)
- [ ] `SLACK_*` (notifications)

---

## Summary

Clianta uses **25+ environment variables** across:
- **Server**: Port, URLs, environment
- **Database**: MongoDB, Redis
- **Authentication**: JWT, sessions, OAuth
- **AI**: Google Gemini/Vertex AI
- **Email**: Resend, Nodemailer
- **Integrations**: Apollo, Twilio, Slack, etc.

**Security**: All secrets encrypted, never committed to git
**Flexibility**: Supports local development and cloud production
**Documentation**: Template files and setup guides provided

For related documentation, see:
- [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) - Deployment setup
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Integration API keys
- [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md) - Queue configuration
