# Authentication System Documentation

## Overview

This project includes a complete JWT-based authentication system with email verification, password reset functionality, and protected routes. The authentication system is built with:

- **Backend**: Express.js + TypeScript + MongoDB + Passport.js
- **Frontend**: Next.js 14 (App Router) + TypeScript + Zustand + Framer Motion
- **Security**: JWT tokens, bcrypt password hashing, rate limiting, email verification

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [API Endpoints](#api-endpoints)
5. [Authentication Flow](#authentication-flow)
6. [Security Features](#security-features)
7. [File Structure](#file-structure)
8. [Usage Examples](#usage-examples)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas account
- Email service credentials (Gmail, SendGrid, etc.)

### 1. Backend Setup

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Edit .env and add your configuration
# IMPORTANT: Add your MongoDB URI and email credentials

# Install dependencies (already done)
npm install

# Start the server
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Copy environment variables (if not already present)
cp .env.example .env.local

# Dependencies are already installed
# Start the development server
npm run dev
```

Frontend will run on `http://localhost:3000`

---

## Backend Setup

### Environment Variables

Edit `backend/.env` with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/mrmorris
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mrmorris

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM_NAME=MrMorris
```

### Email Service Setup

#### Gmail Setup (Recommended for Development)

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the generated password
3. Use the app password as `EMAIL_PASS` in your `.env`

#### Alternative Email Services

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

**Mailgun:**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your-mailgun-smtp-username
EMAIL_PASS=your-mailgun-smtp-password
```

**AWS SES:**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASS=your-ses-smtp-password
```

### Backend Files Added

```
backend/
├── src/
│   ├── models/
│   │   └── User.ts                    # User model with auth fields
│   ├── routes/
│   │   └── auth.ts                    # Authentication routes
│   ├── middleware/
│   │   └── auth.ts                    # JWT verification middleware
│   ├── services/
│   │   └── email.ts                   # Email service with templates
│   ├── config/
│   │   └── passport.ts                # Passport.js configuration
│   └── validations/
│       └── auth.ts                    # Zod validation schemas
└── .env.example                       # Environment variables template
```

---

## Frontend Setup

### Environment Variables

Edit `frontend/.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Next.js App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Frontend Files Added

```
frontend/
├── app/
│   ├── login/
│   │   └── page.tsx                   # Login page
│   ├── register/
│   │   └── page.tsx                   # Registration page
│   ├── verify-email/
│   │   └── page.tsx                   # Email verification page
│   ├── forgot-password/
│   │   └── page.tsx                   # Forgot password page
│   ├── reset-password/
│   │   └── page.tsx                   # Reset password page
│   └── dashboard/
│       └── page.tsx                   # Protected dashboard
├── components/
│   └── auth/
│       └── ProtectedRoute.tsx         # Protected route component
├── lib/
│   ├── api/
│   │   └── auth.ts                    # Auth API functions
│   ├── validations/
│   │   └── auth.ts                    # Frontend validation schemas
│   └── axios.ts                       # Axios instance with JWT injection
└── store/
    └── useAuthStore.ts                # Zustand auth state management
```

---

## API Endpoints

### Authentication Endpoints

All authentication endpoints are prefixed with `/api/auth`

#### POST `/api/auth/register`

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": false
    }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### POST `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": true
    }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### POST `/api/auth/verify-email`

Verify user email with token.

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

---

#### POST `/api/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Rate Limit:** 3 requests per hour

---

#### POST `/api/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### GET `/api/auth/me`

Get current authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": true,
      "createdAt": "2025-01-08T..."
    }
  }
}
```

**Protected:** Requires JWT token

---

#### POST `/api/auth/change-password`

Change user password (while logged in).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully!"
}
```

**Protected:** Requires JWT token

---

#### POST `/api/auth/resend-verification`

Resend verification email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an unverified account exists, a verification email has been sent."
}
```

**Rate Limit:** 3 requests per hour

---

#### POST `/api/auth/logout`

Logout user (client-side token removal).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful!"
}
```

**Protected:** Requires JWT token

---

## Authentication Flow

### Registration Flow

```
1. User submits registration form
   ↓
2. Backend validates input
   ↓
3. Password is hashed with bcrypt
   ↓
4. User is created in database (isVerified: false)
   ↓
5. Verification token is generated
   ↓
6. Verification email is sent
   ↓
7. User clicks link in email
   ↓
8. Email is verified (isVerified: true)
   ↓
9. User is auto-logged in with JWT token
```

### Login Flow

```
1. User submits login credentials
   ↓
2. Backend finds user by email
   ↓
3. Password is compared with bcrypt
   ↓
4. Check if email is verified
   ↓
5. JWT token is generated
   ↓
6. Token is returned to client
   ↓
7. Token is stored in localStorage and cookies
   ↓
8. Token is attached to all subsequent requests
```

### Password Reset Flow

```
1. User requests password reset
   ↓
2. Reset token is generated (1 hour expiry)
   ↓
3. Reset email is sent
   ↓
4. User clicks link in email
   ↓
5. User submits new password
   ↓
6. Password is hashed and updated
   ↓
7. User is auto-logged in with new JWT token
```

---

## Security Features

### 1. Password Security
- **Bcrypt hashing** with salt rounds of 12
- **Minimum password requirements**: 8 characters, 1 uppercase, 1 lowercase, 1 number
- **Password strength indicator** on frontend

### 2. JWT Tokens
- **Signed tokens** with secret key
- **7-day expiration** (configurable)
- **Bearer token authentication**
- **Automatic token injection** in Axios requests

### 3. Email Verification
- **Required before login**
- **24-hour token expiration**
- **Secure random token generation**

### 4. Rate Limiting
- **Auth endpoints**: 5 requests per 15 minutes
- **Email endpoints**: 3 requests per hour
- **Prevents brute force attacks**

### 5. Input Validation
- **Zod schemas** on both frontend and backend
- **Email format validation**
- **SQL injection prevention** with MongoDB
- **XSS protection** with input sanitization

### 6. CORS Configuration
- **Whitelisted origins** only
- **Credentials support** for cookies
- **Secure headers**

### 7. Token Storage
- **localStorage** for primary storage
- **HttpOnly cookies** as backup
- **Automatic cleanup** on logout/401

### 8. Password Reset Security
- **1-hour token expiration**
- **One-time use tokens**
- **Email enumeration prevention**
- **Secure token generation**

---

## File Structure

### Backend Architecture

```
backend/src/
├── models/
│   └── User.ts
│       - User schema with authentication fields
│       - Password hashing pre-save hook
│       - Password comparison method
│       - Token generation methods
│
├── routes/
│   └── auth.ts
│       - All authentication endpoints
│       - Rate limiting middleware
│       - Input validation with Zod
│       - Error handling
│
├── middleware/
│   └── auth.ts
│       - JWT verification middleware
│       - User attachment to request
│       - Optional authentication
│       - Email verification check
│
├── services/
│   └── email.ts
│       - Nodemailer configuration
│       - Email sending functions
│       - HTML email templates
│       - Multiple provider support
│
├── config/
│   └── passport.ts
│       - Passport.js configuration
│       - JWT strategy
│       - Local strategy
│
└── validations/
    └── auth.ts
        - Zod validation schemas
        - Type exports
```

### Frontend Architecture

```
frontend/
├── app/
│   ├── login/page.tsx              - Login page with animations
│   ├── register/page.tsx           - Registration with password strength
│   ├── verify-email/page.tsx       - Email verification handler
│   ├── forgot-password/page.tsx    - Request password reset
│   ├── reset-password/page.tsx     - Reset password with token
│   └── dashboard/page.tsx          - Protected dashboard example
│
├── components/auth/
│   └── ProtectedRoute.tsx          - HOC for route protection
│
├── lib/
│   ├── api/auth.ts                 - Auth API functions
│   ├── validations/auth.ts         - Frontend Zod schemas
│   └── axios.ts                    - Axios with JWT injection
│
└── store/
    └── useAuthStore.ts             - Zustand auth state
```

---

## Usage Examples

### Protecting a Route

```typescript
// app/protected-page/page.tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <div>This content is protected</div>
    </ProtectedRoute>
  );
}
```

### Using Auth State

```typescript
"use client";

import { useAuthStore } from "@/store/useAuthStore";

export default function MyComponent() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Making Authenticated API Calls

```typescript
import { axiosInstance } from "@/lib/axios";

// Token is automatically attached by axios interceptor
const response = await axiosInstance.get("/auth/me");
```

### Protecting Backend Routes

```typescript
// In your route file
import { authenticate } from "../middleware/auth";

router.get("/protected", authenticate, async (req: AuthRequest, res) => {
  // req.user is available here
  const user = req.user;
  res.json({ user });
});
```

---

## Troubleshooting

### Email Not Sending

**Problem:** Verification or reset emails not being sent.

**Solutions:**
1. Check your email credentials in `.env`
2. For Gmail, ensure you're using an App Password, not your regular password
3. Check if 2FA is enabled on your Google account
4. Verify `EMAIL_HOST` and `EMAIL_PORT` are correct
5. Check server logs for email errors

### JWT Token Issues

**Problem:** "Invalid token" or "Token expired" errors.

**Solutions:**
1. Check `JWT_SECRET` is set in backend `.env`
2. Ensure frontend and backend are using the same secret
3. Clear localStorage and cookies, then login again
4. Check token expiration time (`JWT_EXPIRE`)

### CORS Errors

**Problem:** CORS policy blocking requests.

**Solutions:**
1. Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
2. Ensure backend CORS is configured correctly in `server.ts`
3. Check that `withCredentials: true` is set in axios

### MongoDB Connection Issues

**Problem:** Cannot connect to MongoDB.

**Solutions:**
1. Ensure MongoDB is running locally (`mongod`)
2. Check `MONGODB_URI` in `.env`
3. For MongoDB Atlas, verify IP whitelist and credentials
4. Check network connectivity

### Rate Limiting Triggering Too Often

**Problem:** Getting rate limit errors during development.

**Solutions:**
1. Temporarily increase limits in `backend/src/routes/auth.ts`
2. Clear rate limit cache (restart server)
3. Use different email addresses for testing

### Password Requirements Not Met

**Problem:** Password validation failing.

**Solutions:**
- Password must be at least 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number

---

## Production Deployment Checklist

- [ ] Change `JWT_SECRET` to a strong, random value
- [ ] Set `NODE_ENV=production`
- [ ] Use a production-grade email service (SendGrid, Mailgun, etc.)
- [ ] Enable HTTPS for frontend and backend
- [ ] Configure production MongoDB (MongoDB Atlas recommended)
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Enable rate limiting on reverse proxy (Nginx, Cloudflare)
- [ ] Set up proper error logging (Sentry, LogRocket)
- [ ] Configure backup and monitoring for MongoDB
- [ ] Review and adjust JWT expiration time
- [ ] Set up SSL certificates
- [ ] Configure environment variables on hosting platform

---

## Additional Resources

- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Framer Motion Documentation](https://www.framer.com/motion/)

---

## Support

If you encounter any issues or have questions, please:
1. Check this documentation thoroughly
2. Review the troubleshooting section
3. Check server logs for errors
4. Verify environment variables are set correctly

---

**Built with ❤️ for MrMorris**
