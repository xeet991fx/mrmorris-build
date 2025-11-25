# Authentication Setup Guide

## Overview

Your MrMorris application now has fully functional authentication with:
- ✅ Email/Password registration and login
- ✅ Google OAuth 2.0 authentication
- ✅ Email verification
- ✅ Password reset functionality
- ✅ Beautiful, modern UI with animations

## What Was Fixed

### 1. Frontend Enhancements

#### Login Page (`frontend/app/login/page.tsx`)
- Added error handling for OAuth failures via URL parameters
- Implemented loading state for Google login button
- Added better error messages for login failures
- Created dedicated `handleGoogleLogin` function
- Improved user feedback with toast notifications

#### Register Page (`frontend/app/register/page.tsx`)
- Added error handling for OAuth failures via URL parameters
- Implemented loading state for Google signup button
- Added better error messages for registration failures
- Created dedicated `handleGoogleSignup` function
- Improved user feedback with toast notifications

#### Auth Callback Page (`frontend/app/auth/callback/page.tsx`)
- Redesigned to match app's theme (black/neutral with #9ACD32 green)
- Added animated background gradient orbs
- Improved loading animation with rotating spinner
- Added better error handling with automatic redirects
- Enhanced UX with delay before redirect

### 2. Configuration Fixes

#### Environment Variables
- Updated `frontend/.env.local`:
  - `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3001`

- Updated `backend/.env`:
  - `FRONTEND_URL=http://localhost:3001`
  - Enhanced MongoDB URI with retry parameters

#### Axios Configuration (`frontend/lib/axios.ts`)
- Fixed double `/api/api` path issue
- Now correctly uses `NEXT_PUBLIC_API_URL` as-is

#### MongoDB Configuration (`backend/src/config/database.ts`)
- Increased connection timeout from 10s to 30s
- Added `retryWrites: true` and `retryReads: true`
- Better error handling and connection caching

## Current Setup

### Backend Server
- **URL**: http://localhost:5000
- **Auth Endpoints**: http://localhost:5000/api/auth
- **Google OAuth**:
  - Initiate: GET /api/auth/google
  - Callback: GET /api/auth/google/callback

### Frontend Server
- **URL**: http://localhost:3001
- **Login Page**: http://localhost:3001/login
- **Register Page**: http://localhost:3001/register
- **Auth Callback**: http://localhost:3001/auth/callback

## How to Use

### 1. Start the Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 2. Test Authentication

#### Email/Password Registration:
1. Go to http://localhost:3001/register
2. Fill in your name, email, and password
3. Click "Create Account"
4. Check your email for verification link
5. Click verification link to activate account
6. Log in at http://localhost:3001/login

#### Google OAuth Login/Signup:
1. Go to http://localhost:3001/login or http://localhost:3001/register
2. Click "Continue with Google" button
3. Select your Google account
4. Allow permissions
5. You'll be automatically redirected to projects page

## Troubleshooting

### MongoDB Connection Issues

If you see "Server selection timed out" error:

**Solution 1: Check MongoDB Atlas IP Whitelist**
1. Go to https://cloud.mongodb.com
2. Navigate to your cluster
3. Click "Network Access" in the left sidebar
4. Add your current IP address or allow access from anywhere (0.0.0.0/0) for development

**Solution 2: Check Network/Firewall**
- Ensure your firewall allows outbound connections to MongoDB Atlas
- Try disabling VPN if you're using one
- Check if your ISP blocks MongoDB ports

**Solution 3: Verify MongoDB URI**
- Ensure the password in the connection string doesn't contain special characters that need URL encoding
- Current URI format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

### Google OAuth Issues

If Google OAuth redirect fails:

**Check Google Cloud Console:**
1. Go to https://console.cloud.google.com
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - `http://localhost:3001/auth/callback`

### Frontend "Missing Required Components" Error

This was fixed by:
- Correcting the `NEXT_PUBLIC_API_URL` in `.env.local`
- Fixing the axios baseURL configuration
- Ensuring frontend URL matches actual running port (3001)

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user with email/password |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/me` | Get current user (requires auth) |
| POST | `/api/auth/change-password` | Change password (requires auth) |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

## Features

### Security Features
- JWT token-based authentication
- Password hashing with bcrypt
- Email verification
- Rate limiting on auth endpoints
- Secure cookie handling
- CORS protection

### User Experience Features
- Smooth animations with Framer Motion
- Real-time form validation
- Password strength indicator
- Loading states for all actions
- Toast notifications for feedback
- Auto-redirect after auth
- Error handling with helpful messages

## Environment Variables Reference

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Backend `.env`
```env
PORT=5000
BACKEND_URL=http://localhost:5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Production Deployment

When deploying to production:

1. Update environment variables:
   - Change `FRONTEND_URL` to your production domain
   - Change `NEXT_PUBLIC_API_URL` to your API domain
   - Update `BACKEND_URL` to your API domain
   - Generate strong `JWT_SECRET`

2. Update Google OAuth:
   - Add production redirect URIs to Google Cloud Console
   - Example: `https://yourdomain.com/auth/callback`
   - Example: `https://api.yourdomain.com/api/auth/google/callback`

3. Update MongoDB:
   - Whitelist production server IPs
   - Or use VPC peering for better security

4. Enable HTTPS:
   - Google OAuth requires HTTPS in production
   - Use SSL/TLS certificates

## Support

If you encounter any issues:
1. Check browser console for frontend errors
2. Check backend terminal for server errors
3. Verify all environment variables are set correctly
4. Ensure MongoDB Atlas IP whitelist includes your IP
5. Verify Google OAuth redirect URIs in Google Cloud Console

---

Created: November 25, 2025
Status: ✅ Fully Functional
