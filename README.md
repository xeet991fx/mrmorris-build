# MrMorris - Autonomous Marketing Copilot

A professional landing page for MrMorris, an autonomous marketing copilot built with multi-agent AI architecture for marketing agencies.

## 🚀 Overview

MrMorris is your AI Marketing Team That Never Sleeps. This landing page showcases a multi-agent autonomous marketing system that runs campaigns end-to-end, optimizes performance in real-time, and drives results 24/7.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Validation**: React Hook Form + Zod
- **Theme**: next-themes (Dark mode support)

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Validation**: Zod
- **CORS**: Enabled for frontend

## 📁 Project Structure

```
MrMorris/
├── frontend/                      # Next.js Frontend
│   ├── app/
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout with theme provider
│   │   └── page.tsx              # Main landing page
│   ├── components/
│   │   ├── landing/              # Landing page sections
│   │   ├── providers/            # React context providers
│   │   ├── shared/               # Shared components
│   │   └── ui/                   # Reusable UI components (shadcn)
│   ├── lib/
│   │   ├── api/
│   │   │   └── waitlist.ts       # API functions using Axios
│   │   ├── validations/
│   │   │   └── waitlist.ts       # Zod validation schemas
│   │   ├── axios.ts              # Axios instance configuration
│   │   └── utils.ts              # Utility functions
│   ├── store/
│   │   ├── useWaitlistStore.ts   # Waitlist state management
│   │   └── useThemeStore.ts      # Theme state management
│   ├── .env.local                # Frontend environment variables
│   └── package.json              # Frontend dependencies
│
├── backend/                       # Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts       # MongoDB connection
│   │   ├── models/
│   │   │   └── Waitlist.ts       # Mongoose models
│   │   ├── routes/
│   │   │   └── waitlist.ts       # Express routes
│   │   ├── validations/
│   │   │   └── waitlist.ts       # Zod validation schemas
│   │   └── server.ts             # Express server setup
│   ├── .env                      # Backend environment variables
│   ├── tsconfig.json             # TypeScript config
│   └── package.json              # Backend dependencies
│
├── package.json                   # Root package for concurrent scripts
└── README.md
```

## ⚙️ Setup Instructions

### 1. Install Dependencies

Install all dependencies for both frontend and backend:

```bash
# Install root dependencies (concurrently)
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

Or use the convenient script:

```bash
npm run install:all
```

### 2. Configure Environment Variables

#### Frontend (.env.local in frontend/)

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Next.js App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Backend (.env in backend/)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mrmorris
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# For MongoDB Atlas (Production):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mrmorris?retryWrites=true&w=majority
```

### 3. Set Up MongoDB

#### Option A: Local MongoDB
Install MongoDB locally and start the service:
```bash
# Windows
net start MongoDB

# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `backend/.env`

### 4. Run Development Servers

#### Run both frontend and backend concurrently:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

#### Or run them separately:
```bash
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - Backend
npm run dev:backend
```

### 5. Available Scripts

```bash
# Development
npm run dev              # Run both frontend and backend
npm run dev:frontend     # Run only frontend
npm run dev:backend      # Run only backend

# Production
npm run build            # Build both frontend and backend
npm run start            # Start both in production mode
npm run start:frontend   # Start only frontend
npm run start:backend    # Start only backend

# Installation
npm run install:all      # Install all dependencies
```

## ✨ Features

### Landing Page Sections
- **Hero Section**: Compelling headline with animated gradient background
- **Problem Statement**: Four key pain points for marketing agencies
- **Solution Overview**: Multi-agent architecture visualization
- **Core Features**: Six detailed feature cards with capabilities
- **How It Works**: Three-step process visualization
- **Agency Benefits**: Six benefit cards with stats
- **Platform Integrations**: 12+ integration showcases
- **Social Proof**: Stats and testimonials
- **FAQ Section**: Eight comprehensive FAQs
- **Waitlist CTA**: Functional email capture form
- **Footer**: Navigation and social links

### Technical Features
- ✅ Fully responsive design (mobile, tablet, desktop)
- ✅ Dark mode support with toggle
- ✅ Smooth scroll animations with Framer Motion
- ✅ Form validation with Zod
- ✅ MongoDB integration for waitlist
- ✅ RESTful API with Express
- ✅ TypeScript for type safety
- ✅ Zustand for state management
- ✅ Axios for HTTP requests
- ✅ CORS enabled for cross-origin requests
- ✅ SEO optimized with meta tags
- ✅ Professional UI with shadcn/ui components

## 📡 API Documentation

### Base URL
```
http://localhost:5000
```

### Endpoints

#### Health Check
```http
GET /health
```
Response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

#### Join Waitlist
```http
POST /api/waitlist
Content-Type: application/json

{
  "email": "user@example.com",
  "companyName": "Acme Inc", // optional
  "role": "Marketing Director", // optional
  "teamSize": "6-20", // optional: "1-5" | "6-20" | "21-50" | "51-200" | "200+"
  "source": "website" // optional
}
```
Success Response (201):
```json
{
  "message": "Successfully joined the waitlist!",
  "data": {
    "email": "user@example.com",
    "createdAt": "2025-11-07T10:53:56.116Z"
  }
}
```

#### Check Waitlist Status
```http
GET /api/waitlist?email=user@example.com
```
Response:
```json
{
  "onWaitlist": true,
  "joinedAt": "2025-11-07T10:53:56.116Z"
}
```

## 🎨 Customization

### Colors
Edit `tailwind.config.ts` to customize the color scheme:
```typescript
colors: {
  primary: "hsl(var(--primary))",
  // ... other colors
}
```

### Content
All content is in component files under `components/landing/`. Edit any section to update text, stats, or features.

### Dark/Light Theme
The app defaults to dark mode. Change in `app/layout.tsx`:
```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="dark"  // Change to "light" or "system"
  enableSystem
>
```

## 🔒 Security Notes

- Never commit `.env.local` to version control
- Use strong MongoDB connection strings with authentication
- Validate all user inputs (already implemented with Zod)
- Consider rate limiting for production API endpoints

## 📊 Database Schema

### Waitlist Collection
```typescript
{
  email: string (required, unique)
  companyName: string (optional)
  role: string (optional)
  teamSize: "1-5" | "6-20" | "21-50" | "51-200" | "200+" (optional)
  source: string (optional)
  createdAt: Date
  updatedAt: Date
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms
- **Netlify**: Configure Next.js plugin
- **AWS Amplify**: Follow Next.js deployment guide
- **Railway**: Deploy with MongoDB addon
- **Render**: Deploy with managed MongoDB

## 🔮 Future Development

This landing page is built with scalability in mind. You can extend it to build the full MrMorris product:

### Suggested Architecture
```
/app
  /dashboard          # Main dashboard
  /campaigns          # Campaign management
  /analytics          # Analytics views
  /agents             # Agent configuration
  /settings           # User settings
  /(auth)            # Authentication routes
    /login
    /register
/lib
  /agents            # AI agent implementations
  /api-clients       # External API integrations
  /hooks             # Custom React hooks
```

### Next Steps
1. **Authentication**: Add NextAuth.js for user management
2. **Dashboard**: Build the main application dashboard
3. **Agent System**: Implement the multi-agent architecture
4. **Integrations**: Connect to Google Ads, Meta, LinkedIn, etc.
5. **Real-time Updates**: Add WebSocket for live campaign updates
6. **Billing**: Integrate Stripe for subscription management
7. **Admin Panel**: Build admin dashboard for user management

## 📝 License

This project is proprietary software for MrMorris.

## 🤝 Contributing

This is a private project. For access or questions, contact the development team.

---

Built with ❤️ for marketing agencies worldwide
#   M r - M o r r i s 
 
 
# mrmorris-build
