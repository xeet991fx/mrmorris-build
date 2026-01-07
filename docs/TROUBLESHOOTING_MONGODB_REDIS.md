# MrMorris Backend - Critical Issues Fix

## 🚨 Current Issues

### 1. MongoDB Connection Error
**Error**: `querySrv ESERVFAIL _mongodb._tcp.cluster0.el3m88h.mongodb.net`

**Cause**: DNS cannot resolve MongoDB Atlas hostname

**Solutions** (try in order):

#### Option A: Use Local MongoDB (Recommended for Development)
```env
# In backend/.env, change to:
MONGODB_URI=mongodb://localhost:27017/mrmorris
```

Then install and start MongoDB locally:
```powershell
# Install MongoDB
winget install MongoDB.Server

# Start MongoDB
net start MongoDB
```

#### Option B: Fix DNS and Use Standard Connection String
1. Flush DNS:
```powershell
ipconfig /flushdns
```

2. Change MongoDB Atlas connection string from SRV to standard format:
```env
# Get this from MongoDB Atlas:
# 1. Go to your cluster
# 2. Click "Connect"
# 3. Choose "Connect your application"
# 4. Select "Standard connection string" (not SRV)
# 
# It should look like:
MONGODB_URI=mongodb://username:password@cluster0-shard-00-00.el3m88h.mongodb.net:27017,cluster0-shard-00-01.el3m88h.mongodb.net:27017,cluster0-shard-00-02.el3m88h.mongodb.net:27017/mrmorris?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin
```

#### Option C: Change DNS Servers
Use Google DNS (8.8.8.8) in your network settings

---

### 2. Redis Rate Limit Exceeded
**Error**: `ERR max requests limit exceeded. Limit: 500000`

**Cause**: Upstash Redis free tier limit reached (500,000 requests per month)

**Solutions**:

#### ✅ Temporary Fix (ALREADY APPLIED)
I've **commented out all background jobs** in `server.ts` to stop hitting Redis. Your server should now start without Redis errors.

#### Permanent Solutions:

**Option A: Use Local Redis (Recommended for Development)**
```powershell
# Install Redis using winget
winget install Redis.Redis

# Or download from: https://github.com/tporadowski/redis/releases

# Start Redis
redis-server

# In backend/.env, change to:
REDIS_URL=redis://localhost:6379
```

**Option B: Upgrade Upstash Plan**
- Go to https://console.upstash.com/
- Upgrade to paid plan for unlimited requests

**Option C: Reset Upstash Database**
- Go to Upstash console
- Delete current Redis database
- Create new one (resets request count)
- Update `REDIS_URL` in `.env` with new connection string

---

## 🔧 Quick Fix Steps

### Step 1: Fix MongoDB
```powershell
# Install local MongoDB
winget install MongoDB.Server

# Start MongoDB service
net start MongoDB
```

Update `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/mrmorris
```

### Step 2: Fix Redis
```powershell
# Download Redis for Windows
# From: https://github.com/tporadowski/redis/releases
# Extract and run redis-server.exe

# OR use winget (if available)
winget install Redis.Redis
redis-server
```

Update `backend/.env`:
```env
REDIS_URL=redis://localhost:6379
```

### Step 3: Re-enable Background Jobs (After Redis is Fixed)
In `backend/src/server.ts`, uncomment the job initialization lines (around line 454-489).

### Step 4: Restart Backend
```powershell
npm run dev
```

---

## ✅ What I've Done

1. **Disabled all background jobs** - Prevents Redis rate limit errors
2. Your server should now start (if MongoDB connects)

## 🎯 Next Steps

1. **Install local MongoDB** (quick, recommended)
2. **Install local Redis** (or reset Upstash)
3. **Restart backend** - Should work now
4. **Re-enable jobs** later when Redis is working

---

## 📊 Background Jobs Disabled

- ❌ Workflow scheduler
- ❌ Contact sync scheduler  
- ❌ Email sync job
- ❌ Intent score decay job
- ❌ Salesforce sync job
- ❌ Lifecycle progression job
- ❌ Lead recycling job
- ❌ Proactive AI jobs (meeting prep, stale deals, daily insights)

These can be re-enabled by uncommenting them in `server.ts` once Redis is working.
