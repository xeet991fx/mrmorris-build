"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  CubeIcon,
  CommandLineIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import TrackingTestFile from "./TrackingTestFile";
import { cn } from "@/lib/utils";

interface UniversalTrackingInstallerProps {
  workspaceId: string;
}

type InstallMethod = "npm" | "cdn" | "yarn" | "pnpm";
type Framework = "nextjs" | "react" | "vue" | "html" | "nodejs";

export default function UniversalTrackingInstaller({
  workspaceId,
}: UniversalTrackingInstallerProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [installMethod, setInstallMethod] = useState<InstallMethod>("npm");
  const [selectedFramework, setSelectedFramework] = useState<Framework>("nextjs");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const cdnUrl = "https://cdn.clianta.online/sdk/v1";

  const copyToClipboard = (code: string, section: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Install commands
  const installCommands: Record<InstallMethod, string> = {
    npm: "npm install @clianta/sdk",
    yarn: "yarn add @clianta/sdk",
    pnpm: "pnpm add @clianta/sdk",
    cdn: `<script src="${cdnUrl}/clianta.min.js"></script>`,
  };

  // Framework-specific code examples with separate files for each step
  const frameworkExamples: Record<Framework, { title: string; files: { name: string; path: string; code: string }[] }> = {
    nextjs: {
      title: "Next.js (App Router)",
      files: [
        {
          name: "clianta.config.ts",
          path: "Create in project root: /clianta.config.ts",
          code: `import { CliantaConfig } from '@clianta/sdk';

const config: CliantaConfig = {
  projectId: '${workspaceId}',
  apiEndpoint: '${backendUrl}',
  debug: process.env.NODE_ENV === 'development',
};

export default config;`,
        },
        {
          name: "app/layout.tsx",
          path: "Update your layout: /app/layout.tsx",
          code: `import { CliantaProvider } from '@clianta/sdk/react';
import cliantaConfig from '../clianta.config';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CliantaProvider config={cliantaConfig}>
          {children}
        </CliantaProvider>
      </body>
    </html>
  );
}`,
        },
      ],
    },
    react: {
      title: "React (Vite / CRA)",
      files: [
        {
          name: "clianta.config.ts",
          path: "Create in project root: /clianta.config.ts",
          code: `import { CliantaConfig } from '@clianta/sdk';

const config: CliantaConfig = {
  projectId: '${workspaceId}',
  apiEndpoint: '${backendUrl}',
};

export default config;`,
        },
        {
          name: "src/main.tsx",
          path: "Update your entry point: /src/main.tsx",
          code: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { CliantaProvider } from '@clianta/sdk/react';
import cliantaConfig from '../clianta.config';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CliantaProvider config={cliantaConfig}>
      <App />
    </CliantaProvider>
  </React.StrictMode>
);`,
        },
      ],
    },
    vue: {
      title: "Vue.js 3",
      files: [
        {
          name: "clianta.config.ts",
          path: "Create in project root: /clianta.config.ts",
          code: `import { CliantaConfig } from '@clianta/sdk';

const config: CliantaConfig = {
  projectId: '${workspaceId}',
  apiEndpoint: '${backendUrl}',
};

export default config;`,
        },
        {
          name: "src/main.ts",
          path: "Update your entry point: /src/main.ts",
          code: `import { createApp } from 'vue';
import { createClianta } from '@clianta/sdk/vue';
import cliantaConfig from '../clianta.config';
import App from './App.vue';

const app = createApp(App);
app.use(createClianta(cliantaConfig));
app.mount('#app');`,
        },
      ],
    },
    html: {
      title: "HTML / Static Sites",
      files: [
        {
          name: "index.html",
          path: "Add to your HTML file: /index.html",
          code: `<!DOCTYPE html>
<html>
<head>
  <script src="${cdnUrl}/clianta.min.js"></script>
  <script>
    Clianta.init({
      projectId: '${workspaceId}',
      apiEndpoint: '${backendUrl}'
    });
  </script>
</head>
<body>
  <button onclick="Clianta.track('click', 'CTA Button')">
    Click Me
  </button>
</body>
</html>`,
        },
      ],
    },
    nodejs: {
      title: "Node.js / Server-Side",
      files: [
        {
          name: "clianta.config.ts",
          path: "Create in project root: /clianta.config.ts",
          code: `import { CliantaConfig } from '@clianta/sdk';

const config: CliantaConfig = {
  projectId: '${workspaceId}',
  apiEndpoint: '${backendUrl}',
  authToken: process.env.CLIANTA_AUTH_TOKEN,
};

export default config;`,
        },
        {
          name: "server.ts",
          path: "Use in your server: /server.ts or /src/index.ts",
          code: `import { CRMClient } from '@clianta/sdk';
import cliantaConfig from './clianta.config';

const crm = new CRMClient(cliantaConfig);

// Fetch contacts
const contacts = await crm.getContacts({ page: 1, limit: 50 });

// Create contact
await crm.createContact({
  email: 'user@example.com',
  firstName: 'John',
});`,
        },
      ],
    },
  };

  const frameworks: { id: Framework; name: string; icon: React.ReactNode }[] = [
    { id: "nextjs", name: "Next.js", icon: <span className="text-lg font-bold">N</span> },
    { id: "react", name: "React", icon: <span className="text-lg">⚛</span> },
    { id: "vue", name: "Vue", icon: <span className="text-lg font-bold text-emerald-500">V</span> },
    { id: "html", name: "HTML", icon: <GlobeAltIcon className="w-4 h-4" /> },
    { id: "nodejs", name: "Node.js", icon: <span className="text-lg font-bold text-green-500">N</span> },
  ];

  const apiMethods = [
    { method: "track()", desc: "Track custom events", example: `tracker.track('purchase', 'Order Completed', { orderId: '123', value: 99 })` },
    { method: "identify()", desc: "Identify users", example: `tracker.identify('user@email.com', { firstName: 'John', plan: 'pro' })` },
    { method: "page()", desc: "Track page views", example: `tracker.page('Pricing', { referrer: document.referrer })` },
    { method: "consent()", desc: "GDPR consent", example: `tracker.consent({ analytics: true, marketing: false })` },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border/50 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CubeIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Clianta SDK</h1>
            <p className="text-sm text-muted-foreground">
              Professional tracking SDK for lead generation and analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <a href="https://www.npmjs.com/package/@clianta/sdk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs bg-muted/50 px-3 py-1.5 rounded-full hover:bg-muted transition-colors">
            <span className="text-red-500 font-bold">npm</span>
            <span className="text-muted-foreground">@clianta/sdk</span>
          </a>
          <span className="text-xs text-muted-foreground">v1.0.0</span>
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            TypeScript
          </span>
        </div>
      </div>

      {/* Step 1: Installation */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">1</span>
          Install the SDK
        </h2>

        {/* Install method tabs */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit mb-4">
          {(["npm", "yarn", "pnpm", "cdn"] as InstallMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => setInstallMethod(method)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                installMethod === method
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {method.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Install command */}
        <div className="relative">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-950 rounded-lg border border-border/50">
            <CommandLineIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <code className="text-sm text-gray-300 font-mono flex-1 overflow-x-auto">
              {installCommands[installMethod]}
            </code>
            <button
              onClick={() => copyToClipboard(installCommands[installMethod], "install")}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
            >
              {copiedSection === "install" ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Step 2: Initialize */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">2</span>
          Initialize in your app
        </h2>

        {/* Pre-configured notice */}
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-300 font-medium">Ready to copy!</p>
            <p className="text-xs text-emerald-400/80">
              The code below is pre-configured with your Project ID (<code className="bg-emerald-500/20 px-1 rounded">{workspaceId.slice(0, 8)}...</code>). Just copy, paste, and you are ready to go.
            </p>
          </div>
        </div>

        {/* Framework tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {frameworks.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setSelectedFramework(fw.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap",
                selectedFramework === fw.id
                  ? "bg-primary/10 border-primary/50 text-primary"
                  : "bg-muted/20 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {fw.icon}
              {fw.name}
            </button>
          ))}
        </div>

        {/* Code examples - each file as separate step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedFramework}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {frameworkExamples[selectedFramework].files.map((file, index) => (
              <div key={file.name} className="rounded-lg border border-border/50 overflow-hidden">
                {/* File header with step number and path */}
                <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        2.{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <DocumentTextIcon className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            {file.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {file.path}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(file.code, `code-${index}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                    >
                      {copiedSection === `code-${index}` ? (
                        <>
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Code block */}
                <pre className="p-4 bg-gray-950 text-gray-300 text-sm font-mono overflow-x-auto max-h-64">
                  <code>{file.code}</code>
                </pre>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Step 3: API Reference */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">3</span>
          Start tracking
        </h2>

        <div className="grid gap-3">
          {apiMethods.map((api) => (
            <div
              key={api.method}
              className="p-4 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono font-semibold text-primary">{api.method}</code>
                <span className="text-xs text-muted-foreground">{api.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground flex-1 bg-background/50 px-3 py-1.5 rounded overflow-x-auto">
                  {api.example}
                </code>
                <button
                  onClick={() => copyToClipboard(api.example, api.method)}
                  className="p-1.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                >
                  {copiedSection === api.method ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ClipboardDocumentIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Project ID */}
      <section className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <h3 className="text-sm font-semibold text-amber-400 mb-1">Your Project ID</h3>
        <p className="text-xs text-amber-400/70 mb-3">Use this ID if you need to manually configure the SDK</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-background/50 rounded font-mono text-sm text-amber-300">
            {workspaceId}
          </code>
          <button
            onClick={() => copyToClipboard(workspaceId, "workspace")}
            className="p-2 hover:bg-amber-500/20 rounded transition-colors"
          >
            {copiedSection === "workspace" ? (
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
            ) : (
              <ClipboardDocumentIcon className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </section>

      {/* Test & Docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-border/50 bg-muted/10">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <CodeBracketIcon className="w-4 h-4 text-purple-500" />
            Test Your Integration
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Download a test page to verify tracking
          </p>
          <TrackingTestFile workspaceId={workspaceId} />
        </div>

        <div className="p-4 rounded-lg border border-border/50 bg-muted/10">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <BookOpenIcon className="w-4 h-4 text-blue-500" />
            Documentation
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Full API reference and guides
          </p>
          <div className="flex gap-2">
            <a
              href="https://docs.clianta.online"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              View Docs
            </a>
            <a
              href="https://github.com/clianta/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
