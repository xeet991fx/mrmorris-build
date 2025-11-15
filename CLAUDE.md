# CLAUDE.md - AI Assistant Guide for MrMorris

> **Last Updated**: 2025-11-15
> **Purpose**: Comprehensive guide for AI assistants working on the MrMorris codebase
> **Project**: MrMorris - Autonomous Marketing Copilot for Agencies

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Codebase Structure](#codebase-structure)
4. [Development Workflows](#development-workflows)
5. [Key Conventions](#key-conventions)
6. [Authentication System](#authentication-system)
7. [Database Models](#database-models)
8. [API Patterns](#api-patterns)
9. [Frontend Patterns](#frontend-patterns)
10. [Best Practices](#best-practices)
11. [Common Tasks](#common-tasks)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

**MrMorris** is an AI-powered autonomous marketing copilot designed for marketing agencies. The platform features:

- Multi-agent AI architecture for campaign management
- Project-based workflow with comprehensive onboarding
- Advanced authentication system (JWT, OTP, Google OAuth)
- Real-time campaign optimization
- Multi-channel marketing automation

**Current Status**: Active development with functional landing page, authentication system, and project management features.

---

## Architecture & Tech Stack

### Monorepo Structure

The project uses a **monorepo architecture** with separate frontend and backend:

```
mrmorris-build/
├── frontend/          # Next.js 14 application
├── backend/           # Express.js API server
├── package.json       # Root scripts for concurrent dev
└── vercel.json        # Deployment configuration
```

### Frontend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React framework with App Router | 14.2.0 |
| **TypeScript** | Type safety | 5.0+ |
| **Tailwind CSS** | Utility-first styling | 3.4.0 |
| **shadcn/ui** | Component library | Latest |
| **Framer Motion** | Animations | 11.0.0 |
| **Zustand** | State management | 5.0.8 |
| **Axios** | HTTP client with interceptors | 1.13.2 |
| **Zod** | Schema validation | 3.22.0 |
| **React Hook Form** | Form handling | 7.50.0 |
| **next-themes** | Dark/light mode | 0.2.1 |

### Backend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime environment | 20+ |
| **Express.js** | Web framework | 4.18.2 |
| **TypeScript** | Type safety | 5.3.3 |
| **MongoDB** | Database | 8.0.0 |
| **Mongoose** | ODM for MongoDB | 8.0.0 |
| **Passport.js** | Authentication middleware | 0.7.0 |
| **JWT** | Token-based auth | 9.0.2 |
| **bcryptjs** | Password hashing | 3.0.3 |
| **Nodemailer** | Email service | 7.0.10 |
| **Zod** | Schema validation | 3.22.0 |

### Deployment

- **Frontend**: Vercel (Next.js optimized)
- **Backend**: Vercel Serverless Functions (via `/api` directory)
- **Database**: MongoDB Atlas (production)
- **Email**: Gmail SMTP (dev), SendGrid/Mailgun (prod recommended)

---

## Codebase Structure

### Frontend Directory Layout

```
frontend/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout with theme provider
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Global styles & Tailwind
│   ├── login/page.tsx                # Login page
│   ├── register/page.tsx             # Registration page
│   ├── verify-email/page.tsx         # Email verification
│   ├── forgot-password/page.tsx      # Password reset request
│   ├── reset-password/page.tsx       # Password reset form
│   ├── dashboard/page.tsx            # User dashboard (protected)
│   ├── projects/                     # Project management
│   │   ├── page.tsx                  # Projects list
│   │   └── [id]/page.tsx            # Individual project view
│   └── auth/
│       └── callback/page.tsx         # OAuth callback handler
│
├── components/
│   ├── landing/                      # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Pricing.tsx
│   │   └── ...
│   ├── auth/                         # Authentication components
│   │   ├── ProtectedRoute.tsx        # Route protection HOC
│   │   └── OTPInput.tsx              # 6-digit OTP input
│   ├── projects/                     # Project-related components
│   │   ├── CreateProjectModal.tsx
│   │   ├── OnboardingWizard.tsx      # Multi-step onboarding
│   │   ├── ProgressIndicator.tsx
│   │   └── wizard/                   # Wizard step components
│   ├── forms/                        # Reusable form components
│   ├── shared/                       # Shared UI components
│   ├── providers/                    # React context providers
│   │   └── theme-provider.tsx
│   └── ui/                           # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...
│
├── lib/
│   ├── api/                          # API client functions
│   │   ├── auth.ts                   # Auth API calls
│   │   ├── waitlist.ts               # Waitlist API calls
│   │   └── project.ts                # Project API calls
│   ├── validations/                  # Zod schemas (frontend)
│   │   ├── auth.ts
│   │   ├── waitlist.ts
│   │   └── project.ts
│   ├── axios.ts                      # Axios instance with JWT injection
│   └── utils.ts                      # Utility functions (cn, etc.)
│
├── store/                            # Zustand state stores
│   ├── useAuthStore.ts               # Auth state & actions
│   ├── useProjectStore.ts            # Project state & actions
│   ├── useWaitlistStore.ts           # Waitlist state
│   └── useThemeStore.ts              # Theme state
│
├── public/                           # Static assets
├── .env.local                        # Environment variables (gitignored)
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── components.json                   # shadcn/ui configuration
└── package.json
```

### Backend Directory Layout

```
backend/
├── src/
│   ├── server.ts                     # Express app & server initialization
│   │
│   ├── config/
│   │   ├── database.ts               # MongoDB connection logic
│   │   └── passport.ts               # Passport strategies (JWT, Google OAuth)
│   │
│   ├── models/                       # Mongoose schemas
│   │   ├── User.ts                   # User model with auth fields
│   │   ├── Waitlist.ts               # Waitlist entries
│   │   ├── Project.ts                # Project model with onboarding data
│   │   └── OTP.ts                    # OTP codes with expiration
│   │
│   ├── routes/                       # Express route handlers
│   │   ├── auth.ts                   # Auth endpoints (/api/auth)
│   │   ├── waitlist.ts               # Waitlist endpoints (/api/waitlist)
│   │   └── project.ts                # Project endpoints (/api/projects)
│   │
│   ├── middleware/
│   │   └── auth.ts                   # JWT verification middleware
│   │
│   ├── services/
│   │   ├── email.ts                  # Nodemailer email service
│   │   └── otp.ts                    # OTP generation & verification
│   │
│   └── validations/                  # Zod schemas (backend)
│       ├── auth.ts
│       ├── waitlist.ts
│       └── project.ts
│
├── dist/                             # Compiled TypeScript (gitignored)
├── .env                              # Environment variables (gitignored)
├── tsconfig.json                     # TypeScript configuration
└── package.json
```

### Root Directory

```
mrmorris-build/
├── .git/                             # Git repository
├── .github/                          # GitHub workflows (if any)
├── .vscode/settings.json             # VSCode configuration
├── .mcp.json                         # MCP configuration
├── .claude/settings.local.json       # Claude Code settings
├── README.md                         # Main project documentation
├── AUTH_README.md                    # Authentication system guide
├── CLERK_AUTH_IMPLEMENTATION.md      # OTP & OAuth implementation details
├── GOOGLE_OAUTH_SETUP.md             # Google OAuth setup guide
├── CLAUDE.md                         # This file
├── package.json                      # Root scripts (concurrently)
├── tsconfig.json                     # Root TypeScript config
├── vercel.json                       # Vercel deployment config
└── .gitignore
```

---

## Development Workflows

### Local Development Setup

#### 1. Initial Installation

```bash
# Clone the repository
git clone <repository-url>
cd mrmorris-build

# Install all dependencies
npm run install:all

# Or install individually
npm install                    # Root dependencies
cd frontend && npm install     # Frontend dependencies
cd ../backend && npm install   # Backend dependencies
```

#### 2. Environment Configuration

**Backend** (`backend/.env`):
```env
# Server
PORT=5000
NODE_ENV=development
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/mrmorris
# OR MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mrmorris

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM_NAME=MrMorris

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 3. Start Development Servers

```bash
# Option 1: Run both concurrently (recommended)
npm run dev

# Option 2: Run separately
npm run dev:frontend    # Terminal 1
npm run dev:backend     # Terminal 2
```

**Servers**:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health check: http://localhost:5000/health

### Git Workflow

**Branch Strategy**:
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Production hotfixes

**Commit Convention**:
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: auth, project, landing, api, ui, etc.

Examples:
feat(auth): add OTP verification flow
fix(project): resolve onboarding wizard step navigation
docs(readme): update installation instructions
```

### Testing Workflow

Currently, the project doesn't have automated tests. When implementing:

**Frontend Testing**:
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright or Cypress

**Backend Testing**:
- Unit tests: Jest
- Integration tests: Supertest
- API tests: Postman collections

---

## Key Conventions

### TypeScript Conventions

#### 1. File Naming

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `useAuthStore.ts` |
| Utils/Helpers | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `UserTypes.ts` |
| API functions | camelCase | `fetchUsers.ts` |
| Constants | UPPER_SNAKE_CASE | `API_CONSTANTS.ts` |

#### 2. Type Definitions

**Interfaces vs Types**:
- Use `interface` for object shapes (models, props)
- Use `type` for unions, intersections, primitives

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
}

type AuthMethod = "email" | "google" | "otp";

// ❌ Avoid
type User = {
  id: string;
  email: string;
};
```

**Import/Export Types**:
```typescript
// Always export types separately
export type { User, Project };
export interface AuthResponse {
  token: string;
  user: User;
}
```

#### 3. Component Patterns

**Functional Components**:
```typescript
// ✅ Preferred pattern
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ children, onClick, variant = "primary" }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn("btn", `btn-${variant}`)}>
      {children}
    </button>
  );
}

// ❌ Avoid default exports for components
export default function Button() { }
```

### React Patterns

#### Client vs Server Components

**Next.js 14 uses Server Components by default**. Mark with `"use client"` only when:
- Using hooks (`useState`, `useEffect`, etc.)
- Using browser APIs
- Event handlers
- Context providers/consumers

```typescript
// Server Component (default) - NO "use client"
export function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>;
}

// Client Component - requires "use client"
"use client";
import { useState } from "react";

export function InteractiveCard() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

#### State Management

**Zustand Store Pattern**:
```typescript
// store/useExampleStore.ts
import { create } from 'zustand';

interface ExampleState {
  // State
  data: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchData: () => Promise<void>;
  setData: (data: string[]) => void;
  reset: () => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  // Initial state
  data: [],
  isLoading: false,
  error: null,

  // Actions
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getData();
      set({ data: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  setData: (data) => set({ data }),
  reset: () => set({ data: [], isLoading: false, error: null }),
}));
```

### API Conventions

#### Request/Response Format

**Success Response**:
```typescript
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error Response**:
```typescript
{
  "success": false,
  "error": "Error message",
  "details": { /* optional error details */ }
}
```

#### API Client Pattern

```typescript
// lib/api/example.ts
import { axiosInstance } from "@/lib/axios";

export interface CreateItemRequest {
  name: string;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
}

export const itemApi = {
  // GET request
  getItems: async (): Promise<Item[]> => {
    const { data } = await axiosInstance.get("/items");
    return data.data;
  },

  // GET by ID
  getItem: async (id: string): Promise<Item> => {
    const { data } = await axiosInstance.get(`/items/${id}`);
    return data.data;
  },

  // POST request
  createItem: async (payload: CreateItemRequest): Promise<Item> => {
    const { data } = await axiosInstance.post("/items", payload);
    return data.data;
  },

  // PUT/PATCH request
  updateItem: async (id: string, payload: Partial<CreateItemRequest>): Promise<Item> => {
    const { data } = await axiosInstance.patch(`/items/${id}`, payload);
    return data.data;
  },

  // DELETE request
  deleteItem: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/items/${id}`);
  },
};
```

### Validation with Zod

**Shared validation between frontend and backend**:

```typescript
// Backend: backend/src/validations/example.ts
import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  email: z.string().email("Invalid email format"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

// Frontend: frontend/lib/validations/example.ts
// Copy the same schema for client-side validation
import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  email: z.string().email("Invalid email format"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
```

**Usage in Backend**:
```typescript
import { createItemSchema } from "../validations/example";

router.post("/items", async (req, res) => {
  try {
    const validated = createItemSchema.parse(req.body);
    // Use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
  }
});
```

**Usage in Frontend with React Hook Form**:
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createItemSchema, CreateItemInput } from "@/lib/validations/example";

export function CreateItemForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
  });

  const onSubmit = (data: CreateItemInput) => {
    // Data is already validated
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  );
}
```

### Styling Conventions

#### Tailwind CSS

**Class Organization** (use `cn` utility):
```typescript
import { cn } from "@/lib/utils";

// ✅ Good - organized by category
<div className={cn(
  // Layout
  "flex items-center justify-between",
  // Spacing
  "px-4 py-2 gap-2",
  // Styling
  "bg-primary text-white rounded-lg shadow-md",
  // States
  "hover:bg-primary/90 transition-colors",
  // Responsive
  "md:px-6 md:py-3",
  // Conditional
  isActive && "ring-2 ring-blue-500"
)} />

// ❌ Avoid - random order, hard to read
<div className="hover:bg-primary/90 px-4 text-white flex bg-primary" />
```

**Responsive Design Breakpoints**:
```typescript
// Tailwind breakpoints (mobile-first)
sm: "640px"   // Small devices
md: "768px"   // Tablets
lg: "1024px"  // Laptops
xl: "1280px"  // Desktops
2xl: "1536px" // Large screens

// Usage
<div className="text-sm md:text-base lg:text-lg" />
```

---

## Authentication System

### Authentication Methods

The project supports **three authentication methods**:

1. **Email + Password** (traditional)
2. **Email + OTP** (passwordless)
3. **Google OAuth** (social login)

### Auth Flow Overview

#### Registration Flow (OTP-based)

```
User enters email
    ↓
Send OTP code (6 digits, 10-min expiry)
    ↓
User enters OTP code
    ↓
Verify OTP code
    ↓
User sets password & name
    ↓
Complete registration
    ↓
Auto-login with JWT token
    ↓
Redirect to dashboard
```

#### Login Flow (Password-based)

```
User enters email + password
    ↓
Verify credentials
    ↓
Check if email is verified
    ↓
Generate JWT token
    ↓
Return token to client
    ↓
Store in localStorage + cookies
    ↓
Redirect to dashboard
```

#### Login Flow (OTP-based)

```
User enters email
    ↓
Send OTP code
    ↓
User enters OTP code
    ↓
Verify OTP code
    ↓
Auto-login with JWT token
    ↓
Redirect to dashboard
```

#### Google OAuth Flow

```
User clicks "Continue with Google"
    ↓
Redirect to Google OAuth consent screen
    ↓
User authorizes application
    ↓
Redirect back to /api/auth/google/callback
    ↓
Backend validates OAuth code
    ↓
Check if user exists (by email)
    ↓
If exists: Link Google account
If not: Create new user
    ↓
Generate JWT token
    ↓
Redirect to frontend /auth/callback with token
    ↓
Frontend stores token
    ↓
Redirect to dashboard
```

### Auth Endpoints

| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|------------|
| POST | `/api/auth/register` | Register with email/password | 5/15min |
| POST | `/api/auth/login` | Login with email/password | 5/15min |
| POST | `/api/auth/send-otp` | Send OTP code | 3/hour |
| POST | `/api/auth/verify-otp` | Verify OTP code | 5/15min |
| POST | `/api/auth/complete-register` | Complete registration after OTP | - |
| POST | `/api/auth/forgot-password` | Request password reset | 3/hour |
| POST | `/api/auth/reset-password` | Reset password with token | 5/15min |
| POST | `/api/auth/verify-email` | Verify email with token | - |
| POST | `/api/auth/resend-verification` | Resend verification email | 3/hour |
| GET | `/api/auth/me` | Get current user | Protected |
| POST | `/api/auth/change-password` | Change password | Protected |
| POST | `/api/auth/logout` | Logout user | Protected |
| GET | `/api/auth/google` | Initiate Google OAuth | - |
| GET | `/api/auth/google/callback` | Handle OAuth callback | - |

### JWT Token Handling

**Token Storage** (client-side):
- Primary: `localStorage.getItem("token")`
- Backup: `Cookies.get("token")`
- Cleared on logout or 401 responses

**Token Injection** (axios interceptor):
```typescript
// lib/axios.ts automatically injects token
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Token Verification** (backend middleware):
```typescript
// Usage in routes
import { authenticate } from "../middleware/auth";

router.get("/protected", authenticate, (req: AuthRequest, res) => {
  const user = req.user; // User object attached by middleware
  res.json({ user });
});
```

### Protected Routes

**Frontend Protection**:
```typescript
// Using ProtectedRoute HOC
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected content</div>
    </ProtectedRoute>
  );
}

// Or using auth store directly
"use client";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated]);

  return <div>Content</div>;
}
```

### Security Features

1. **Password Security**:
   - bcrypt hashing (12 rounds)
   - Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number
   - Password strength indicator on frontend

2. **OTP Security**:
   - Cryptographically secure random generation
   - 6-digit codes
   - 10-minute expiration
   - Rate limiting (3 requests/hour)
   - Max 5 verification attempts per OTP

3. **JWT Security**:
   - Signed with secret key
   - 7-day expiration (configurable)
   - Automatic refresh handling
   - Secure HttpOnly cookies

4. **CORS**:
   - Whitelisted origins only
   - Credentials support enabled
   - Preflight handling

5. **Input Validation**:
   - Zod validation on both frontend and backend
   - SQL injection prevention (MongoDB)
   - XSS protection

---

## Database Models

### User Model

```typescript
interface IUser {
  _id: ObjectId;
  email: string;              // Unique, required
  password?: string;          // Optional (for OAuth users)
  name: string;
  authProvider: "email" | "google";
  googleId?: string;          // For Google OAuth users
  profilePicture?: string;
  isVerified: boolean;        // Email verification status
  verificationToken?: string;
  verificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Methods**:
- `comparePassword(password)`: Compare hashed password
- `generateVerificationToken()`: Create email verification token
- `generatePasswordResetToken()`: Create password reset token

### Project Model

```typescript
interface IProject {
  _id: ObjectId;
  userId: ObjectId;           // Reference to User
  name: string;
  onboardingCompleted: boolean;
  onboardingData: {
    business: {
      name?: string;
      description?: string;
      product?: string;
      problem?: string;
      audience?: string;
      region?: string;
      stage?: "Idea" | "Pre-launch" | "Launched but no revenue" | "Generating revenue" | "Scaling";
    };
    goals: {
      primary?: "Get early users / signups" | "Generate leads or demo calls" | ...;
      budget?: number;
      timeline?: "Within 2 weeks" | "Within 1 month" | "Long-term brand building";
    };
    channels: {
      preferred?: string[];
      tools?: string[];
      past_experience?: "Yes, but results were poor" | "Yes, some success" | "No, starting fresh";
    };
    brand: {
      tone?: "Professional" | "Friendly" | "Bold" | ...;
      perception?: string;
      unique_value?: string;
    };
    offer: {
      offer_type?: "Free trial" | "Free demo" | ...;
      cta?: string;
      tracking_setup?: boolean;
    };
    competition: {
      competitors?: string[];
      inspiration?: string[];
    };
    advanced: {
      uploads?: string[];
      business_type?: "B2B" | "B2C" | "Both";
      automation_level?: "Fully automated" | "Notify before changes" | "Ask every time";
    };
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### OTP Model

```typescript
interface IOTP {
  _id: ObjectId;
  email: string;
  code: string;               // 6-digit code
  purpose: "registration" | "login" | "password-reset";
  expiresAt: Date;            // 10 minutes from creation
  attempts: number;           // Max 5 attempts
  createdAt: Date;
}
```

**Auto-expiration**: MongoDB TTL index automatically deletes expired OTPs.

### Waitlist Model

```typescript
interface IWaitlist {
  _id: ObjectId;
  email: string;              // Unique
  companyName?: string;
  role?: string;
  teamSize?: "1-5" | "6-20" | "21-50" | "51-200" | "200+";
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Patterns

### Backend Route Structure

```typescript
// routes/example.ts
import express from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Validation schema
const createSchema = z.object({
  name: z.string().min(3),
});

// Public route
router.get("/", async (req, res) => {
  try {
    const items = await Model.find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected route
router.post("/", authenticate, async (req, res) => {
  try {
    const validated = createSchema.parse(req.body);
    const item = await Model.create({ ...validated, userId: req.user._id });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### Error Handling Pattern

**Backend**:
```typescript
try {
  // Operation
} catch (error) {
  console.error("Error:", error);

  if (error instanceof z.ZodError) {
    return res.status(400).json({ success: false, error: error.errors });
  }

  if (error.code === 11000) { // MongoDB duplicate key
    return res.status(400).json({ success: false, error: "Resource already exists" });
  }

  res.status(500).json({ success: false, error: "Internal server error" });
}
```

**Frontend**:
```typescript
import toast from "react-hot-toast";

try {
  const data = await api.createItem(payload);
  toast.success("Item created successfully!");
  return data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error || "An error occurred";
    toast.error(message);
  } else {
    toast.error("An unexpected error occurred");
  }
  throw error;
}
```

---

## Frontend Patterns

### Page Structure

```typescript
// app/example/page.tsx
"use client"; // Only if using hooks/interactivity

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExampleStore } from "@/store/useExampleStore";
import { PageLayout } from "@/components/shared/PageLayout";
import { ExampleCard } from "@/components/example/ExampleCard";

export default function ExamplePage() {
  const router = useRouter();
  const { items, isLoading, fetchItems } = useExampleStore();

  useEffect(() => {
    fetchItems();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <PageLayout title="Example Page">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <ExampleCard key={item.id} item={item} />
        ))}
      </div>
    </PageLayout>
  );
}
```

### Form Handling Pattern

```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createItemSchema, CreateItemInput } from "@/lib/validations/example";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export function CreateItemForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
  });

  const onSubmit = async (data: CreateItemInput) => {
    try {
      await api.createItem(data);
      toast.success("Item created!");
      reset();
    } catch (error) {
      // Error already handled by API client
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          {...register("name")}
          placeholder="Item name"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Item"}
      </Button>
    </form>
  );
}
```

### Modal Pattern (using shadcn Dialog)

```typescript
"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExampleModal({ isOpen, onClose }: ExampleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modal Title</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Modal content */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Best Practices

### Code Quality

1. **TypeScript Strictness**:
   - Enable `strict: true` in `tsconfig.json`
   - Avoid `any` types; use `unknown` if type is truly unknown
   - Use type guards for narrowing types

2. **Component Size**:
   - Keep components under 200 lines
   - Extract reusable logic into custom hooks
   - Split large components into smaller sub-components

3. **Imports**:
   - Use absolute imports with `@/` alias
   - Group imports: React → third-party → local
   - Remove unused imports

4. **Comments**:
   - Use JSDoc for complex functions
   - Explain "why", not "what"
   - Keep comments up-to-date

### Performance

1. **React Optimization**:
   - Use `React.memo()` for expensive components
   - Memoize callbacks with `useCallback()`
   - Memoize computed values with `useMemo()`

2. **Image Optimization**:
   - Use Next.js `<Image>` component
   - Specify width/height to prevent layout shift
   - Use WebP format when possible

3. **Bundle Size**:
   - Lazy load components with `React.lazy()`
   - Use dynamic imports for large dependencies
   - Check bundle with `npm run build`

### Security

1. **Environment Variables**:
   - Never commit `.env` files
   - Use `NEXT_PUBLIC_` prefix for client-side vars
   - Validate env vars on startup

2. **Authentication**:
   - Always verify JWT tokens on backend
   - Don't trust client-side auth state alone
   - Implement rate limiting on sensitive endpoints

3. **Input Sanitization**:
   - Validate all user input with Zod
   - Sanitize HTML content
   - Use parameterized queries (MongoDB does this by default)

---

## Common Tasks

### Adding a New API Endpoint

1. **Define Zod Schema** (backend):
```typescript
// backend/src/validations/feature.ts
export const createFeatureSchema = z.object({
  name: z.string().min(3),
});
```

2. **Create Route Handler** (backend):
```typescript
// backend/src/routes/feature.ts
import { createFeatureSchema } from "../validations/feature";

router.post("/", authenticate, async (req, res) => {
  const validated = createFeatureSchema.parse(req.body);
  // Handle request
});
```

3. **Register Route** (backend):
```typescript
// backend/src/server.ts
import featureRoutes from "./routes/feature";
app.use("/api/features", featureRoutes);
```

4. **Create API Client** (frontend):
```typescript
// frontend/lib/api/feature.ts
export const createFeature = async (data: CreateFeatureInput) => {
  const { data: response } = await axiosInstance.post("/features", data);
  return response.data;
};
```

5. **Add to Store** (frontend):
```typescript
// frontend/store/useFeatureStore.ts
createFeature: async (data) => {
  set({ isLoading: true });
  const feature = await api.createFeature(data);
  set({ features: [...get().features, feature], isLoading: false });
},
```

### Adding a New Page

1. **Create Page File**:
```typescript
// app/new-page/page.tsx
export default function NewPage() {
  return <div>New Page</div>;
}
```

2. **Add Navigation** (if needed):
```typescript
// In navbar or sidebar component
<Link href="/new-page">New Page</Link>
```

3. **Add Protection** (if private):
```typescript
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function NewPage() {
  return (
    <ProtectedRoute>
      <div>Protected content</div>
    </ProtectedRoute>
  );
}
```

### Adding a New Database Model

1. **Create Model** (backend):
```typescript
// backend/src/models/Feature.ts
import mongoose, { Schema, Document } from "mongoose";

interface IFeature extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
}

const featureSchema = new Schema<IFeature>({
  name: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default mongoose.model<IFeature>("Feature", featureSchema);
```

2. **Add Indexes** (if needed):
```typescript
featureSchema.index({ userId: 1, createdAt: -1 });
```

3. **Export Types**:
```typescript
export type { IFeature };
```

### Updating Environment Variables

1. Update `.env.example` with new variables
2. Update local `.env` file
3. Update Vercel environment variables (production)
4. Restart development servers

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Errors

**Symptom**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solutions**:
- Ensure MongoDB is running: `mongod` or `brew services start mongodb-community`
- Check `MONGODB_URI` in `.env`
- For Atlas: verify IP whitelist and credentials

#### 2. CORS Errors

**Symptom**: `Access-Control-Allow-Origin` errors in browser console

**Solutions**:
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check CORS configuration in `backend/src/server.ts`
- Ensure `withCredentials: true` in axios

#### 3. JWT Token Issues

**Symptom**: "Invalid token" or "Token expired"

**Solutions**:
- Clear localStorage: `localStorage.clear()`
- Clear cookies
- Ensure `JWT_SECRET` is set in backend `.env`
- Check token expiration time

#### 4. Email Not Sending

**Symptom**: OTP or verification emails not received

**Solutions**:
- For Gmail: Use App Password, not regular password
- Check spam folder
- Verify `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` in `.env`
- Check backend logs for email errors

#### 5. Build Errors

**Symptom**: TypeScript compilation errors during build

**Solutions**:
- Run `npm run build` locally to see full errors
- Check for missing type definitions
- Ensure all imports are correct
- Clear `.next` folder: `rm -rf .next`

#### 6. Rate Limiting Errors

**Symptom**: "Too many requests" during development

**Solutions**:
- Temporarily increase limits in route files
- Restart backend server to clear rate limit cache
- Use different email addresses for testing

---

## Additional Documentation

For more detailed information, refer to:

- **[README.md](README.md)**: Project overview and setup
- **[AUTH_README.md](AUTH_README.md)**: Complete authentication system guide
- **[CLERK_AUTH_IMPLEMENTATION.md](CLERK_AUTH_IMPLEMENTATION.md)**: OTP and OAuth implementation details
- **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)**: Google OAuth configuration guide

---

## AI Assistant Guidelines

When working on this codebase:

1. **Always check existing patterns** before creating new ones
2. **Follow TypeScript conventions** strictly
3. **Use Zod validation** for all user inputs
4. **Implement proper error handling** on both frontend and backend
5. **Test authentication flows** after making auth-related changes
6. **Update this document** when adding new patterns or conventions
7. **Ask for clarification** if requirements are ambiguous
8. **Commit frequently** with descriptive messages
9. **Check for type errors** before committing
10. **Consider mobile responsiveness** for all UI changes

---

**Last Updated**: 2025-11-15
**Total Lines of Code**: ~8,500+ lines
**Maintainer**: Development Team
**License**: Proprietary
