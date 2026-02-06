# Clianta - Dependency Management

## Overview

This document catalogs all dependencies across the Clianta monorepo, their purposes, version constraints, and compatibility requirements.

## Package Locations

- **Frontend**: `frontend/package.json` - Next.js application dependencies
- **Backend**: `backend/package.json` - Express API dependencies
- **Root**: `package.json` - Monorepo development scripts only

## 1. Critical Frontend Dependencies

### Framework & Core
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^15.5.9 | Next.js framework - App Router with React Server Components |
| `react` | ^19.2.3 | React library - Latest with concurrent features |
| `react-dom` | ^19.2.3 | React DOM renderer |
| `typescript` | ^5.0.0 | TypeScript language support |

### UI & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^3.4.0 | Utility-first CSS framework |
| `tailwindcss-animate` | ^1.0.7 | Tailwind animation utilities |
| `tailwind-merge` | ^2.2.0 | Utility for merging Tailwind classes |
| `class-variance-authority` | ^0.7.1 | CVA for component variants |
| `clsx` | ^2.1.0 | Utility for constructing className strings |
| `framer-motion` | ^11.0.0 | Animation library for React |
| `lucide-react` | ^0.300.0 | Icon library (Lucide icon set) |
| `react-icons` | ^5.5.0 | Additional icon sets |
| `@heroicons/react` | ^2.2.0 | Heroicons icon library |
| `@fortawesome/react-fontawesome` | ^3.1.1 | Font Awesome React components |
| `@fortawesome/free-solid-svg-icons` | ^7.1.0 | Font Awesome solid icons |
| `@fortawesome/fontawesome-svg-core` | ^7.1.0 | Font Awesome core |

### UI Component Libraries
| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-dialog` | ^1.1.15 | Accessible dialog component |
| `@radix-ui/react-label` | ^2.1.8 | Accessible label component |
| `@radix-ui/react-progress` | ^1.1.8 | Progress bar component |
| `@radix-ui/react-select` | ^2.2.6 | Select dropdown component |
| `@radix-ui/react-slider` | ^1.3.6 | Slider input component |
| `@radix-ui/react-switch` | ^1.2.6 | Toggle switch component |
| `@radix-ui/react-tabs` | ^1.1.13 | Tabs component |
| `@headlessui/react` | ^2.2.9 | Headless UI components |
| `cmdk` | ^1.1.1 | Command menu component (Cmd+K) |
| `sonner` | ^2.0.7 | Toast notification library |

### State Management & Data Fetching
| Package | Version | Purpose |
|---------|---------|---------|
| `zustand` | ^5.0.8 | Lightweight state management (auth, workspace context) |
| `axios` | ^1.13.2 | HTTP client for API requests |
| `js-cookie` | ^3.0.5 | Cookie management utilities |

### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | ^7.50.0 | Form state management |
| `@hookform/resolvers` | ^3.3.0 | Validation resolvers for react-hook-form |
| `zod` | ^3.22.0 | Schema validation library |

### Charts & Visualization
| Package | Version | Purpose |
|---------|---------|---------|
| `chart.js` | ^4.5.1 | Chart.js charting library |
| `react-chartjs-2` | ^5.3.1 | React wrapper for Chart.js |
| `recharts` | ^2.15.4 | React charting library (alternative to Chart.js) |

### Drag & Drop
| Package | Version | Purpose |
|---------|---------|---------|
| `@dnd-kit/core` | ^6.3.1 | Drag and drop core library |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable drag and drop |
| `@dnd-kit/utilities` | ^3.2.2 | dnd-kit utility functions |
| `reactflow` | ^11.11.4 | Flow diagrams and node-based UIs (workflow builder) |

### Rich Text & Email
| Package | Version | Purpose |
|---------|---------|---------|
| `react-email-editor` | ^1.7.11 | Unlayer email template editor |
| `react-markdown` | ^10.1.0 | Markdown renderer |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown plugin |

### Real-Time & Communication
| Package | Version | Purpose |
|---------|---------|---------|
| `socket.io-client` | ^4.8.3 | WebSocket client for real-time chat |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | ^4.1.0 | Date manipulation library |
| `react-dropzone` | ^14.3.8 | File upload drag-and-drop |
| `react-hot-toast` | ^2.6.0 | Toast notifications (alternative to sonner) |
| `next-themes` | ^0.2.1 | Theme management for Next.js |

---

## 2. Critical Backend Dependencies

### Framework & Core
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.2 | Web application framework |
| `typescript` | ^5.3.3 | TypeScript language support |
| `dotenv` | ^16.3.1 | Environment variable management |
| `ts-node` | ^10.9.2 | TypeScript execution for development |
| `nodemon` | ^3.0.2 | Auto-restart during development |

### Database
| Package | Version | Purpose |
|---------|---------|---------|
| `mongoose` | ^8.0.0 | MongoDB object modeling (ODM) |

### Cache & Queue
| Package | Version | Purpose |
|---------|---------|---------|
| `ioredis` | ^5.8.2 | Redis client (supports Upstash TLS) |
| `bullmq` | ^5.66.1 | Queue system for background jobs |
| `@bull-board/api` | ^6.16.1 | Bull Board API for queue monitoring |
| `@bull-board/express` | ^6.16.1 | Express adapter for Bull Board |

### AI & Machine Learning
| Package | Version | Purpose |
|---------|---------|---------|
| `@google/generative-ai` | ^0.24.1 | Google Gemini AI SDK |
| `@langchain/core` | ^1.1.6 | LangChain core framework |
| `@langchain/google-vertexai` | ^2.1.1 | LangChain Google Vertex AI integration |
| `deepagents` | ^1.3.1 | Multi-agent coordination framework (dependency exists but not used - Clianta uses custom coordination system) |
| `google-auth-library` | ^10.5.0 | Google authentication library |

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| `passport` | ^0.7.0 | Authentication middleware |
| `passport-jwt` | ^4.0.1 | JWT authentication strategy |
| `passport-local` | ^1.0.0 | Local email/password strategy |
| `passport-google-oauth20` | ^2.0.0 | Google OAuth2 strategy |
| `jsonwebtoken` | ^9.0.2 | JWT token generation/verification |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `express-rate-limit` | ^8.2.1 | Rate limiting middleware |
| `express-mongo-sanitize` | ^2.2.0 | Prevent NoSQL injection |
| `cookie-parser` | ^1.4.7 | Parse cookies |

### HTTP & Communication
| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.13.2 | HTTP client for third-party APIs |
| `cors` | ^2.8.5 | CORS middleware |
| `socket.io` | ^4.8.3 | WebSocket server for real-time chat |

### Integrations
| Package | Version | Purpose |
|---------|---------|---------|
| `@slack/web-api` | ^7.13.0 | Slack Web API client |
| `googleapis` | ^167.0.0 | Google APIs client (Calendar, Sheets, Drive) |
| `@notionhq/client` | ^5.6.0 | Notion API client |
| `twilio` | ^5.11.1 | Twilio SMS/Voice API |

### Email
| Package | Version | Purpose |
|---------|---------|---------|
| `nodemailer` | ^7.0.10 | Email sending library |
| `resend` | ^6.6.0 | Resend transactional email service |

### File Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `multer` | ^2.0.2 | File upload middleware |
| `sharp` | ^0.34.5 | Image processing and optimization |
| `pdf-parse` | ^1.1.1 | PDF text extraction |
| `xlsx` | ^0.18.5 | Excel file parsing and generation |

### Scheduling & Jobs
| Package | Version | Purpose |
|---------|---------|---------|
| `node-cron` | ^4.2.1 | Cron job scheduling |
| `dayjs` | ^1.11.19 | Date/time manipulation |

### Monitoring & Error Tracking
| Package | Version | Purpose |
|---------|---------|---------|
| `@sentry/node` | ^10.32.1 | Error tracking and monitoring |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `uuid` | ^13.0.0 | UUID generation |
| `zod` | ^3.22.0 | Schema validation (shared with frontend) |

---

## 3. Version Compatibility Matrix

### Node.js Requirements
- **Minimum**: Node.js 18.x (LTS)
- **Recommended**: Node.js 20.x (LTS)
- **Reason**: TypeScript 5.x, native ES modules support, performance improvements

### MongoDB Requirements
- **Minimum**: MongoDB 5.0
- **Recommended**: MongoDB 6.0+ or MongoDB Atlas
- **Reason**: Mongoose 8.0 requires MongoDB 5.0+

### Redis Requirements
- **Minimum**: Redis 6.0
- **Recommended**: Redis 7.0+ or Upstash
- **Reason**: BullMQ requires modern Redis features

### TypeScript Compatibility
- **Frontend**: TypeScript 5.0 with strict mode enabled
- **Backend**: TypeScript 5.3.3 with strict mode disabled (gradual migration)
- **Target**: ES2020 (frontend), ES2020 (backend)

---

## 4. Peer Dependency Resolutions

### React 19 Overrides (Frontend)
```json
"overrides": {
  "@types/react": "19.2.7",
  "@types/react-dom": "19.2.3"
}
```

**Reason**: Many React packages haven't updated to React 19 yet. The overrides force compatible type definitions.

**Affected Packages**:
- `@radix-ui/*` - UI components expecting React 18 types
- `react-hook-form` - Form library expecting React 18 types
- Other React component libraries

---

## 5. Development Dependencies

### Frontend Development
| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | ^20.0.0 | Node.js type definitions |
| `@types/react` | 19.2.7 | React type definitions |
| `@types/react-dom` | 19.2.3 | React DOM type definitions |
| `@types/js-cookie` | ^3.0.6 | js-cookie type definitions |
| `eslint` | ^8.57.0 | JavaScript linter |
| `eslint-config-next` | 15.5.9 | Next.js ESLint configuration |
| `autoprefixer` | ^10.4.0 | CSS autoprefixer for PostCSS |
| `postcss` | ^8.4.0 | CSS transformation tool |
| `terser` | ^5.44.1 | JavaScript minifier (for tracking script) |

### Backend Development
| Package | Version | Purpose |
|---------|---------|---------|
| `@types/express` | ^4.17.21 | Express type definitions |
| `@types/node` | ^20.10.0 | Node.js type definitions |
| `@types/bcryptjs` | ^2.4.6 | bcryptjs type definitions |
| `@types/cookie-parser` | ^1.4.10 | cookie-parser type definitions |
| `@types/cors` | ^2.8.17 | CORS type definitions |
| `@types/jsonwebtoken` | ^9.0.10 | jsonwebtoken type definitions |
| `@types/passport` | ^1.0.17 | Passport type definitions |
| `@types/passport-jwt` | ^4.0.1 | passport-jwt type definitions |
| `@types/passport-local` | ^1.0.38 | passport-local type definitions |
| `@types/passport-google-oauth20` | ^2.0.17 | Google OAuth type definitions |
| `@types/nodemailer` | ^7.0.3 | nodemailer type definitions |
| `@types/multer` | ^2.0.0 | Multer type definitions |
| `@types/node-cron` | ^3.0.11 | node-cron type definitions |
| `@types/uuid` | ^10.0.0 | UUID type definitions |
| `@types/twilio` | ^3.19.2 | Twilio type definitions |
| `@types/pdf-parse` | ^1.1.5 | pdf-parse type definitions |
| `@types/jest` | ^30.0.0 | Jest type definitions (testing framework - not configured) |

### Legacy Dependencies (Not in Active Use)
| Package | Version | Purpose |
|---------|---------|---------|
| `jsforce` | ^3.10.10 | Salesforce API client (legacy) |
| `@types/jsforce` | ^1.11.6 | Salesforce type definitions (legacy) |

---

## 6. Security Considerations

### Known Issues
None currently flagged by npm audit (as of documentation creation).

### Deprecated Packages
None identified in current dependency tree.

### Regular Maintenance
- Run `npm audit` monthly to check for vulnerabilities
- Update dependencies quarterly for security patches
- Test major version updates in staging before production

### High-Risk Dependencies
Monitor these packages for security updates:
- `jsonwebtoken` - Core authentication
- `passport-*` - Authentication strategies
- `bcryptjs` - Password hashing
- `axios` - HTTP requests (potential for SSRF)
- `express` - Web framework
- `mongoose` - Database queries (NoSQL injection risk)

---

## 7. Dependency Update Strategy

### Patch Updates (x.x.PATCH)
- **Frequency**: Weekly
- **Risk**: Low
- **Testing**: Basic smoke tests
- **Command**: `npm update`

### Minor Updates (x.MINOR.x)
- **Frequency**: Monthly
- **Risk**: Medium
- **Testing**: Full regression testing
- **Command**: `npm update --latest`

### Major Updates (MAJOR.x.x)
- **Frequency**: Quarterly or as needed
- **Risk**: High
- **Testing**: Full test suite + manual QA
- **Process**:
  1. Review changelog and breaking changes
  2. Update in development branch
  3. Run full test suite
  4. Manual QA of critical features
  5. Deploy to staging
  6. Monitor for 48 hours
  7. Deploy to production

### Critical Security Updates
- **Frequency**: Immediate
- **Risk**: Varies
- **Testing**: Targeted testing of affected features
- **Process**: Emergency deployment procedure

---

## 8. Dependency Size Analysis

### Frontend Bundle Impact
**Large Dependencies** (impact on client bundle size):
- `react` + `react-dom`: ~140KB gzipped
- `framer-motion`: ~58KB gzipped
- `chart.js`: ~60KB gzipped
- `reactflow`: ~120KB gzipped
- `react-email-editor`: ~200KB gzipped (lazy load recommended)

**Optimization Strategies**:
- Lazy load heavy components (`react-email-editor`, `reactflow`)
- Code splitting via Next.js dynamic imports
- Tree shaking (enabled by default in Next.js)

### Backend Memory Footprint
**Memory-Intensive Dependencies**:
- `mongoose`: ~50MB in memory (with models)
- `@google/generative-ai` + AI dependencies: ~100MB
- TypeScript compilation: Requires 8GB RAM for large codebase

**Optimization**:
- Use `--max-old-space-size=8192` flag for TypeScript compilation
- Consider precompiled images in production (no ts-node overhead)

---

## 9. License Compliance

### Open Source Licenses
All dependencies use permissive licenses compatible with commercial use:
- **MIT License**: Majority of dependencies
- **Apache 2.0**: Google libraries (`@google/generative-ai`, `googleapis`)
- **ISC License**: Some Node.js ecosystem packages
- **BSD License**: Select packages

### Commercial Licenses
- **Unlayer Email Editor**: Free tier (used via `react-email-editor`)
  - Consider commercial license if customization needed
- **Resend**: Freemium (API usage-based pricing)

### License Audit
Run `npx license-checker` to generate full license report.

---

## 10. Monorepo Dependency Management

### Shared Dependencies
Currently managed independently in `frontend/` and `backend/`:
- `axios`: ^1.13.2 (both)
- `zod`: ^3.22.0 (both)
- `typescript`: ^5.x (both, different minor versions)

### Potential Workspace Optimization
Consider migrating to npm workspaces or pnpm workspaces for:
- Shared dependency deduplication
- Centralized version management
- Faster installs
- Shared TypeScript types package

---

## 11. Installation Commands

### First-Time Setup
```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Or manually:
cd frontend && npm install
cd ../backend && npm install
```

### Production Install (Backend)
```bash
cd backend
npm ci --production  # Only production dependencies, no devDependencies
```

### Production Install (Frontend)
```bash
cd frontend
npm ci  # Frontend needs devDependencies for build
npm run build
```

---

## 12. Dependency Tree Insights

### Frontend Dependency Count
- **Total Dependencies**: ~60 packages
- **Dev Dependencies**: ~10 packages
- **Total (with transitive)**: ~800 packages

### Backend Dependency Count
- **Total Dependencies**: ~80 packages
- **Dev Dependencies**: ~20 packages
- **Total (with transitive)**: ~900 packages

### Largest Dependency Trees
1. `next` → 200+ transitive dependencies
2. `mongoose` → 50+ transitive dependencies
3. `@google/generative-ai` + LangChain → 100+ transitive dependencies
4. `googleapis` → 150+ transitive dependencies

---

## Summary

Clianta uses **140+ direct dependencies** across frontend and backend, with a focus on:
- **Type Safety**: TypeScript throughout, Zod for runtime validation
- **Modern Stack**: Latest Next.js 15, React 19, Mongoose 8
- **AI-First**: Google Gemini 2.5 Pro + LangChain + Custom Multi-Agent System (24 specialized agents in `backend/src/chatbot/`)
- **Production-Ready**: Sentry, rate limiting, security middleware
- **Developer Experience**: Hot reload, TypeScript, ESLint

**Maintenance Priority**:
1. Security updates (weekly monitoring)
2. Patch updates (monthly)
3. Minor updates (quarterly)
4. Major updates (as needed, with full QA)

For version-specific compatibility issues or upgrade guides, see:
- [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) - Build requirements
- [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) - Runtime dependencies
