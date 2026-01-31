# MorrisB Tracking SDK

> **Version**: 3.0.0  
> **Status**: Core Complete, Ready for Testing  
> **Last Updated**: 2026-01-30

## Overview

The MorrisB Tracking SDK is a professional, production-ready JavaScript library for tracking website visitors, capturing lead information, and providing behavioral analytics for the MorrisB CRM platform.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Installation](#installation)
4. [API Reference](#api-reference)
5. [Development Progress](#development-progress)
6. [Changelog](#changelog)

---

## Architecture

```
sdk/
├── src/
│   ├── core/
│   │   ├── tracker.ts          # Main tracker class
│   │   ├── config.ts           # Configuration management
│   │   ├── queue.ts            # Event queue with retry logic
│   │   └── transport.ts        # Network layer (fetch/beacon/XHR)
│   ├── plugins/
│   │   ├── base.ts             # Plugin interface
│   │   ├── pageView.ts         # Page view tracking
│   │   ├── forms.ts            # Form auto-tracking
│   │   ├── scroll.ts           # Scroll depth tracking
│   │   ├── clicks.ts           # Click/CTA tracking
│   │   ├── engagement.ts       # User engagement tracking
│   │   ├── downloads.ts        # File download tracking
│   │   ├── exitIntent.ts       # Exit intent detection
│   │   ├── errors.ts           # JavaScript error tracking
│   │   └── performance.ts      # Web Vitals & performance
│   ├── consent/
│   │   ├── manager.ts          # Consent state management
│   │   └── storage.ts          # Consent persistence
│   ├── debug/
│   │   ├── logger.ts           # Debug logging
│   │   └── inspector.ts        # Event inspector overlay
│   ├── storage/
│   │   ├── cookie.ts           # Cookie helpers
│   │   ├── localStorage.ts     # LocalStorage helpers
│   │   └── sessionStorage.ts   # SessionStorage helpers
│   ├── utils/
│   │   ├── uuid.ts             # UUID generation
│   │   ├── dom.ts              # DOM utilities
│   │   └── url.ts              # URL parsing, UTM extraction
│   └── index.ts                # Main entry point
├── types/
│   └── index.d.ts              # TypeScript definitions
├── dist/
│   ├── morrisb.min.js          # Minified UMD build (for <script> tag)
│   ├── morrisb.esm.js          # ES Module (for bundlers)
│   ├── morrisb.cjs.js          # CommonJS (for Node.js/older bundlers)
│   └── morrisb.d.ts            # TypeScript declarations
├── package.json
├── tsconfig.json
├── rollup.config.js
└── README.md
```

---

## Features

### Core Features (Always Enabled)

| Feature | Description | Status |
|---------|-------------|--------|
| Page Views | Automatic page view tracking with metadata | Planned |
| Visitor ID | Persistent visitor identification across sessions | Planned |
| Session ID | Session tracking with 30-minute timeout | Planned |
| UTM Tracking | Capture UTM parameters from URL | Planned |
| Event Batching | Batch events for efficient transmission | Planned |
| Offline Queue | Store events when offline, send when back | Planned |

### Plugin Features (Configurable)

| Plugin | Description | Default | Status |
|--------|-------------|---------|--------|
| Form Tracking | Auto-detect and track form interactions | Enabled | Planned |
| Scroll Depth | Track scroll milestones (25%, 50%, 75%, 100%) | Enabled | Planned |
| Click Tracking | Track button and CTA clicks | Enabled | Planned |
| Engagement | Detect active user engagement | Enabled | Planned |
| Downloads | Track file downloads | Enabled | Planned |
| Exit Intent | Detect when user intends to leave | Enabled | Planned |
| Error Tracking | Capture JavaScript errors | Disabled | Planned |
| Performance | Web Vitals and page speed | Disabled | Planned |

### Developer Experience

| Feature | Description | Status |
|---------|-------------|--------|
| Debug Mode | Verbose logging for troubleshooting | Planned |
| TypeScript Support | Full type definitions | Planned |
| NPM Package | `npm install @morrisb/tracker` | Planned |
| CDN Distribution | `https://cdn.morrisb.com/sdk/v3/morrisb.min.js` | Planned |
| Source Maps | Debug production issues | Planned |

### Privacy & Compliance

| Feature | Description | Status |
|---------|-------------|--------|
| Consent Management | GDPR/CCPA compliant consent flow | Complete |
| Anonymous Mode | Track without personal data until consent | Complete |
| Data Deletion API | Allow users to request data deletion | Complete |
| Cookie-less Mode | First-party storage only | Complete |

---

## Installation

### Script Tag (Recommended for most users)

```html
<!-- MorrisB Tracking SDK -->
<script src="https://cdn.morrisb.com/sdk/v3/morrisb.min.js"></script>
<script>
  morrisb('YOUR_WORKSPACE_ID', {
    apiEndpoint: 'https://api.morrisb.com',
    debug: false
  });
</script>
```

### NPM (For React/Next.js/Vue)

```bash
npm install @morrisb/tracker
```

```typescript
import { morrisb } from '@morrisb/tracker';

const tracker = morrisb('YOUR_WORKSPACE_ID', {
  apiEndpoint: 'https://api.morrisb.com',
  plugins: ['forms', 'scroll', 'clicks']
});
```

### Async Loading (Non-blocking)

```html
<script>
  (function(w,d,s,id,wsId){
    w.MorrisBQueue=w.MorrisBQueue||[];
    w.morrisb=w.morrisb||function(){w.MorrisBQueue.push(arguments)};
    var js=d.createElement(s);js.id=id;js.async=true;
    js.src='https://cdn.morrisb.com/sdk/v3/morrisb.min.js';
    d.head.appendChild(js);
    morrisb(wsId);
  })(window,document,'script','morrisb-sdk','YOUR_WORKSPACE_ID');
</script>
```

---

## API Reference

### Initialization

```typescript
morrisb(workspaceId: string, options?: MorrisBConfig): MorrisBTracker
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiEndpoint` | `string` | Auto-detect | Backend API URL |
| `debug` | `boolean` | `false` | Enable debug logging |
| `consent` | `ConsentConfig` | `undefined` | Consent management config |
| `plugins` | `string[]` | All enabled | Plugins to load |
| `autoPageView` | `boolean` | `true` | Track page views automatically |

### Core Methods

#### `tracker.track(event, properties?)`

Track a custom event.

```typescript
tracker.track('button_click', {
  buttonId: 'signup-cta',
  location: 'hero-section'
});
```

#### `tracker.identify(email, traits?)`

Identify a visitor and link to contact.

```typescript
tracker.identify('john@example.com', {
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Inc'
});
```

#### `tracker.page(name?, properties?)`

Track a page view (called automatically by default).

```typescript
tracker.page('Pricing Page', {
  plan: 'enterprise'
});
```

#### `tracker.consent(status)`

Update consent status.

```typescript
tracker.consent({
  analytics: true,
  marketing: false
});
```

#### `tracker.debug(enabled)`

Toggle debug mode.

```typescript
tracker.debug(true); // Enable verbose logging
```

### Utility Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `tracker.getVisitorId()` | `string` | Get current visitor ID |
| `tracker.getSessionId()` | `string` | Get current session ID |
| `tracker.reset()` | `void` | Reset visitor/session (for logout) |
| `tracker.flush()` | `Promise<void>` | Force send queued events |

---

## Development Progress

### Phase 1: Core SDK (COMPLETED)

- [x] Project setup with TypeScript + Rollup
- [x] Core tracker class implementation
- [x] Event queue with retry logic
- [x] Transport layer (fetch/beacon/XHR)
- [x] Storage utilities (cookie, localStorage, sessionStorage)
- [x] Debug logging system
- [x] Type definitions

### Phase 2: Plugins (COMPLETED)

- [x] Page view plugin (with SPA support)
- [x] Form tracking plugin (with auto-identify)
- [x] Scroll depth plugin
- [x] Click tracking plugin
- [x] Engagement plugin
- [x] Download tracking plugin
- [x] Exit intent plugin
- [x] Error tracking plugin
- [x] Performance/Web Vitals plugin

### Phase 3: Consent & Privacy (COMPLETED)

- [x] Consent manager (src/consent/manager.ts)
- [x] Anonymous mode (track without PII until consent)
- [x] Cookie-less mode (sessionStorage only)
- [x] Data deletion API (GDPR right-to-erasure)

### Phase 4: Distribution (COMPLETED)

- [x] Build system (Rollup config ready)
- [x] NPM publishing (@clianta/sdk v1.0.0)
- [ ] CDN deployment
- [x] TypeScript definitions
- [x] Documentation

---

## Changelog

### v3.0.0 (In Development)

**Breaking Changes:**
- Complete rewrite in TypeScript
- New plugin-based architecture
- New consent management API

**New Features:**
- Full TypeScript support
- Plugin system for modular tracking
- Debug mode with console logging
- Offline event queue with retry
- Consent management (GDPR/CCPA)
- Anonymous mode for pre-consent tracking

**Improvements:**
- Smaller bundle size (~8KB gzipped)
- Better error handling
- Improved form detection
- Enhanced scroll tracking

---

## Migration from v2.x

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for upgrading from the previous version.

---

## Backend Integration

The SDK communicates with these backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/track/event` | POST | Batch event tracking |
| `/api/public/track/identify` | POST | Visitor identification |
| `/track.js` | GET | SDK script delivery |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full backend documentation.

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API_ROUTES_MAP.md](./API_ROUTES_MAP.md) - All API endpoints
- [INTEGRATIONS.md](./INTEGRATIONS.md) - Third-party integrations
