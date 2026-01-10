# Clianta - Build & Deployment Guide

## Overview

This guide covers building Clianta for production and deploying to various platforms.

---

## 1. Build Process

### Frontend Build (Next.js)

```bash
cd frontend
npm run build
```

**Output**: `.next/` directory with optimized production build
**Build Time**: ~2-5 minutes (depends on cache)
**Optimizations**:
- Server-side rendering (SSR)
- Static page generation
- Code splitting
- Image optimization
- Tree shaking

**Tracker Script Build**:
```bash
npm run build:tracker
# Output: public/track.min.js (terser minification)
```

---

### Backend Build (TypeScript)

```bash
cd backend
npm run build
```

**Output**: `dist/` directory with compiled JavaScript
**Compiler**: TypeScript (`tsc`)
**Config**: `backend/tsconfig.json`
**Memory**: Requires 8GB RAM (`--max-old-space-size=8192`)
**Build Time**: ~1-3 minutes

**Build Flags**:
- `--skipLibCheck`: Skip type checking of declaration files (faster builds)
- Incremental compilation: `.tsbuildinfo` cache

---

## 2. Development Workflow

### Concurrent Development

```bash
# Root directory
npm run dev  # Starts both frontend + backend

# OR individually:
cd frontend && npm run dev  # Port 3000
cd backend && npm run dev   # Port 5000
```

**Hot Reload**:
- Frontend: Turbopack (Next.js 15) - instant updates
- Backend: Nodemon + ts-node - auto-restart on file changes

**Memory Allocation** (backend dev):
```bash
node --max-old-space-size=8192 -r ts-node/register/transpile-only src/server.ts
```

---

## 3. Production Build Strategy

### Build Order

```bash
# 1. Backend (TypeScript → JavaScript)
cd backend && npm run build

# 2. Frontend (Next.js optimization)
cd frontend && npm run build

# 3. Verify builds
ls backend/dist/server.js
ls frontend/.next
```

### TypeScript Configurations

**Root** (`tsconfig.json`):
- Includes: `api/`, `backend/src/`
- Extends backend config

**Frontend** (`frontend/tsconfig.json`):
- Next.js-specific settings
- Strict mode: `true`
- Target: ES2020
- Module: ESNext

**Backend** (`backend/tsconfig.json`):
- Strict mode: `false` (gradual migration)
- Target: ES2020
- Module: CommonJS
- Output: `dist/`

---

## 4. Deployment Targets

### Option 1: Railway (Recommended for Backend)

**Features**:
- Auto-deploy from GitHub
- MongoDB & Redis plugins
- Environment variables UI
- Automatic HTTPS
- Built-in logging

**Setup**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy backend
cd backend
railway up
```

**Configuration** (railway.json):
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment Variables**: Set in Railway dashboard (see ENVIRONMENT_CONFIGURATION.md)

---

### Option 2: Vercel (Recommended for Frontend)

**Features**:
- Optimized for Next.js
- Global CDN
- Automatic previews for PRs
- Serverless functions
- Analytics

**Setup**:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

**Configuration** (vercel.json):
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.clianta.online/api/:path*"
    }
  ]
}
```

**Environment Variables**:
- `NEXT_PUBLIC_API_URL`: Backend API URL

---

### Option 3: Docker (Self-Hosted)

**Frontend Dockerfile**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Backend Dockerfile**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

**Docker Compose** (Full Stack):
```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/clianta
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000/api

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo-data:
```

---

## 5. Environment-Specific Configurations

### Development
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/clianta
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
```

### Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/clianta
REDIS_URL=rediss://default:pass@upstash.io:6379
FRONTEND_URL=https://clianta.online
BACKEND_URL=https://api.clianta.online
```

---

## 6. Pre-Deployment Checklist

### Backend
- [ ] All environment variables set (see ENVIRONMENT_CONFIGURATION.md)
- [ ] MongoDB indexes created (automatic on first startup)
- [ ] Redis connection tested
- [ ] Google Vertex AI credentials configured
- [ ] CORS origins include production domain
- [ ] Rate limiting enabled (`NODE_ENV=production`)
- [ ] Sentry DSN set (optional but recommended)
- [ ] Email service API key set (Resend or SMTP)
- [ ] OAuth redirect URIs updated for production domain

### Frontend
- [ ] `NEXT_PUBLIC_API_URL` points to production backend
- [ ] Build completes without errors
- [ ] Environment variables prefixed with `NEXT_PUBLIC_`
- [ ] Tracking scripts minified

### Database
- [ ] MongoDB Atlas cluster created and configured
- [ ] Database user created with appropriate permissions
- [ ] IP whitelist configured (0.0.0.0/0 for cloud deployments)
- [ ] Connection string tested

### Integrations
- [ ] OAuth apps configured with production redirect URIs
- [ ] API keys valid and not rate-limited
- [ ] Webhook URLs point to production backend

---

## 7. Post-Deployment Tasks

### Database Initialization
- MongoDB indexes created automatically on first model access
- Seed data (if needed): `node dist/seeds/initialData.js`

### Background Jobs
**Note**: Currently disabled in development (see BACKGROUND_JOBS.md)

**Enable in production**:
1. Ensure Redis has sufficient capacity (Upstash Standard or Railway Redis)
2. Uncomment job starters in `backend/src/server.ts` (lines 456-490)
3. Redeploy

### Monitoring Setup
1. **Sentry**: Configure `SENTRY_DSN` for error tracking
2. **Logs**: Railway/Vercel provide built-in logging
3. **Bull Board**: Access at `https://api.clianta.online/admin/queues`

### Integration Health Checks
- Test Salesforce sync: `POST /api/workspaces/:id/salesforce/sync`
- Test email sync: Check Bull Board queue activity
- Test AI agents: `POST /api/workspaces/:id/agents/chat`

---

## 8. Scaling Considerations

### Horizontal Scaling

**Backend**:
- Deploy multiple instances behind load balancer
- Stateless design (sessions in Redis)
- Socket.io requires Redis adapter for multi-server:
  ```typescript
  import { createAdapter } from '@socket.io/redis-adapter';
  io.adapter(createAdapter(redisPubClient, redisSubClient));
  ```

**Frontend**:
- Vercel auto-scales
- CDN caching for static assets

**Database**:
- MongoDB Atlas auto-scaling
- Consider read replicas for heavy read workloads

**Redis**:
- Upstash auto-scaling
- Consider Redis Cluster for >10GB data

### Vertical Scaling

**Backend**:
- 512MB RAM minimum
- 1GB+ recommended for AI operations
- 2CPU minimum for background jobs

**MongoDB**:
- M10+ for production (Atlas)
- 2GB+ RAM, SSD storage

**Redis**:
- 256MB minimum
- 1GB+ recommended for heavy queue usage

---

## 9. CI/CD Setup

### GitHub Actions (Example)

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Build
        run: cd backend && npm run build

      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 10. Rollback Strategy

### Vercel (Frontend)
- Instant rollback via dashboard
- Deployment history preserved
- Zero-downtime deployments

### Railway (Backend)
- Rollback to previous deployment via CLI:
  ```bash
  railway rollback <deployment-id>
  ```
- Keep last 5 deployments

### Database
- MongoDB Atlas point-in-time restore (M10+)
- Regular backups recommended
- Test restore procedure monthly

---

## 11. Performance Optimization

### Frontend
- Enable Next.js Image Optimization
- Use `next/font` for web fonts
- Lazy load heavy components (email editor, workflow builder)
- Implement ISR (Incremental Static Regeneration) for public pages

### Backend
- Enable gzip compression:
  ```typescript
  import compression from 'compression';
  app.use(compression());
  ```
- Database query optimization (indexes)
- Use `.lean()` for read-only queries
- Implement request caching for expensive operations

### Database
- Create compound indexes for common queries
- Monitor slow queries (MongoDB Atlas profiler)
- Implement pagination (limit 50-100 records)

---

## 12. Monitoring & Alerts

### Metrics to Track
- **Response Time**: API latency (p50, p95, p99)
- **Error Rate**: 5xx errors percentage
- **Database**: Query performance, connection pool
- **Queue**: Job processing rate, failed jobs
- **Memory**: Backend memory usage (watch for leaks)

### Alerting
- Sentry: Automatic alerts on errors
- Railway: Email alerts on deployment failures
- MongoDB Atlas: Disk space, connection alerts
- Custom: Implement health check endpoint:
  ```typescript
  app.get('/health', async (req, res) => {
    const mongoOk = mongoose.connection.readyState === 1;
    const redisOk = await redis.ping() === 'PONG';

    res.status(mongoOk && redisOk ? 200 : 503).json({
      status: mongoOk && redisOk ? 'healthy' : 'unhealthy',
      mongo: mongoOk,
      redis: redisOk
    });
  });
  ```

---

## 13. Troubleshooting

### Build Failures

**TypeScript Errors**:
- Check `tsconfig.json` configuration
- Run `npm run build` locally first
- Use `--skipLibCheck` for faster iteration

**Out of Memory**:
- Increase Node memory: `--max-old-space-size=8192`
- Railway: Increase service memory allocation

### Deployment Issues

**Environment Variables Missing**:
- Check Railway/Vercel dashboard
- Ensure no typos in variable names
- Verify `.env` template matches deployment config

**Database Connection Failed**:
- Check MongoDB Atlas IP whitelist (0.0.0.0/0 for cloud)
- Verify connection string format
- Test connection locally with same credentials

**504 Gateway Timeout**:
- Check backend startup time (should be <60s)
- Verify database migrations completed
- Check background job initialization

---

## Summary

**Build Process**:
- Frontend: Next.js build → `.next/` directory
- Backend: TypeScript → `dist/` directory
- Memory: 8GB required for backend compilation

**Recommended Stack**:
- Frontend: Vercel (auto-scaling, CDN, zero-config)
- Backend: Railway (easy setup, plugins, logging)
- Database: MongoDB Atlas (managed, backups, scaling)
- Cache: Upstash Redis (serverless, auto-scaling)

**Production Readiness**:
- ✅ Environment variables configured
- ✅ Database indexes created
- ✅ Background jobs enabled (with proper Redis)
- ✅ Error tracking (Sentry)
- ✅ OAuth redirect URIs updated
- ✅ Monitoring and alerts configured

For related documentation, see:
- [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) - Environment variables
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md) - Background job setup
