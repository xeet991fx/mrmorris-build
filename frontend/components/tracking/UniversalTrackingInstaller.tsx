"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  BoltIcon,
  Square2StackIcon,
  PaintBrushIcon,
  BeakerIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import TrackingTestFile from "./TrackingTestFile";
import { cn } from "@/lib/utils";

interface UniversalTrackingInstallerProps {
  workspaceId: string;
}

export default function UniversalTrackingInstaller({
  workspaceId,
}: UniversalTrackingInstallerProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"simple" | "advanced">("simple");
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "checking" | "success" | "error">("pending");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

  // Universal tracking code (works on ANY website)
  const simpleCode = `<!-- MorrisB Lead Tracking - Copy & Paste Anywhere -->
<script src="${backendUrl}/track.js" async></script>
<script>
  window.addEventListener('load', function() {
    if (window.morrisb) {
      morrisb('${workspaceId}', {
        apiEndpoint: '${backendUrl}' // Your API endpoint
      });
    }
  });
</script>`;

  // Advanced code with custom configuration
  const advancedCode = `<!-- MorrisB Lead Tracking - Advanced with Custom Config -->
<script src="${backendUrl}/track.js" async></script>
<script>
  window.addEventListener('load', function() {
    if (window.morrisb) {
      // Initialize with optional features enabled
      var tracker = morrisb('${workspaceId}', {
        // API Configuration
        apiEndpoint: '${backendUrl}',  // Your API endpoint

        // Core lead gen (enabled by default, shown for reference)
        autoFormTracking: true,     // Auto-detect forms
        autoIdentification: true,    // Auto-identify leads
        scrollDepth: true,           // Track scroll depth
        timeOnPage: true,            // Track time spent
        engagement: true,            // Track engagement
        downloads: true,             // Track file downloads
        exitIntent: true,            // Exit intent detection
        ctaClicks: true,             // Button/CTA clicks

        // Optional advanced features (enable as needed)
        outboundLinks: true,         // Track external links
        elementVisibility: true,     // Track CTA visibility
        rageClicks: true,            // Track frustration
        errorTracking: true,         // Track JS errors
        performanceTracking: true,   // Track page speed
        copyTracking: false,         // Track content copying
        deadClicks: false            // Track dead clicks
      });

      // Manual tracking (if needed)
      // tracker.track('custom_event', 'Event Name', { prop: 'value' });
      // tracker.identify('email@example.com', { firstName: 'John' });
    }
  });
</script>`;

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const verifyInstallation = async () => {
    setVerificationStatus("checking");

    // In a real implementation, this would check if events are being received
    // For now, we'll simulate a check
    setTimeout(() => {
      setVerificationStatus("pending");
    }, 2000);
  };

  const platforms = [
    {
      name: "HTML / Static Sites",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L18.09 7 12 10.82 5.91 7 12 4.18zM5 8.09l6 3.27v6.55l-6-3.27V8.09zm8 9.82v-6.55l6-3.27v6.55l-6 3.27z" />
        </svg>
      ),
      instructions: "Paste before closing </head> tag",
      code: simpleCode,
      detailedSteps: [
        "Open your HTML file in a text editor (VS Code, Sublime, Notepad++)",
        "Locate the <head> section near the top of the file",
        "Paste the tracking code just before the </head> closing tag",
        "Save the file and upload it to your web server",
        "Visit your website to activate tracking"
      ],
      notes: "Works with any static HTML site. The tracking script will load automatically on every page.",
    },
    {
      name: "WordPress",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12.158 12.786L9.46 20.625c.806.237 1.657.366 2.54.366 1.047 0 2.051-.18 2.986-.51-.024-.038-.046-.078-.065-.123l-2.76-7.57zM3.009 12c0 3.559 2.068 6.634 5.067 8.092L3.788 8.341C3.289 9.459 3.009 10.696 3.009 12zm15.54.31c0-1.112-.399-1.881-.742-2.48-.456-.742-.883-1.37-.883-2.11 0-.826.627-1.596 1.51-1.596.04 0 .078.005.116.007-1.598-1.464-3.73-2.36-6.05-2.36-3.131 0-5.891 1.61-7.5 4.049.211.007.41.011.579.011.94 0 2.395-.114 2.395-.114.484-.028.54.684.057.74 0 0-.487.058-1.029.086l3.274 9.739 1.968-5.901-1.401-3.838c-.484-.028-.943-.086-.943-.086-.484-.056-.428-.768.056-.74 0 0 1.484.114 2.368.114.94 0 2.397-.114 2.397-.114.486-.028.543.684.058.74 0 0-.488.058-1.03.086l3.25 9.665.897-2.996c.456-1.17.684-2.137.684-2.907z" />
        </svg>
      ),
      instructions: "Appearance → Theme Editor → header.php (before </head>)",
      code: simpleCode,
      detailedSteps: [
        "Log in to your WordPress admin dashboard",
        "Go to Appearance → Theme Editor (or use a child theme for safety)",
        "Click on 'header.php' in the right sidebar",
        "Find the </head> closing tag (usually near line 20-30)",
        "Paste the tracking code just before </head>",
        "Click 'Update File' to save changes",
        "Clear your cache if using a caching plugin"
      ],
      notes: "⚠️ Better option: Use the WordPress Plugin method above to avoid editing theme files directly. If your theme updates, manual code changes will be lost.",
      alternativeMethod: "For safer installation, consider using a 'Header & Footer Scripts' plugin or the MorrisB WordPress plugin.",
    },
    {
      name: "Shopify",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M15.337 2.126c-.034-.018-.063-.018-.086 0-.022.017-.166.086-.359.189-.107-1.001-.524-1.909-1.245-2.702-.048-.052-.1-.052-.149 0C13.464-.36 13.39-.343 13.316-.308c-.03.017-.06.035-.089.052-.036.017-.071.035-.107.069-.834.499-1.439 1.252-1.786 2.237-.277.776-.396 1.716-.368 2.701-.63.193-1.067.33-1.108.347-.623.189-1.263.381-1.902.577-.015.005-.03.012-.044.02-.521.155-.788.241-.853 1.502-.044.897-1.191 9.148-1.191 9.148l10.14 1.912 4.632-1.035S16.034 2.471 15.948 2.299c-.034-.086-.121-.155-.611-.173zm-1.245.604c-.193.06-.412.121-.659.19-.013-.435-.052-.861-.115-1.27.354.19.629.556.774 1.08zm-1.174-1.08c.074.382.119.782.135 1.197-.372.114-.774.237-1.194.363.229-.946.64-1.367 1.059-1.56zm-.504 3.943l-.659 1.964s-.574-.261-1.263-.261c-1.02 0-1.073.646-1.073.808 0 .888 2.301 1.227 2.301 3.303 0 1.633-.904 2.683-2.127 2.683-1.467 0-2.214-1.167-2.214-1.167l.395-1.313s.76.647 1.401.647c.425 0 .599-.339 .599-.604 0-1.054-1.887-1.105-1.887-3.114 0-1.601.951-3.152 2.877-3.152.741 0 1.105.213 1.105.213l-.455 1.993z" />
        </svg>
      ),
      instructions: "Online Store → Themes → Edit Code → theme.liquid (before </head>)",
      code: simpleCode,
      detailedSteps: [
        "From your Shopify admin, go to Online Store → Themes",
        "Click the '...' menu next to your active theme → Edit code",
        "In the 'Layout' folder on the left, click theme.liquid",
        "Press Ctrl+F (Cmd+F on Mac) and search for '</head>'",
        "Paste the tracking code just above the </head> tag",
        "Click 'Save' in the top right corner",
        "Visit your storefront to test (tracking starts immediately)"
      ],
      notes: "The code will automatically appear on all pages of your Shopify store, including product pages, checkout (if available), and blog posts.",
    },
    {
      name: "Webflow",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M14.4 10.8s1.6-4.8 1.6-4.9c.8-2.4 2.4-3.5 4.8-3.3 0 0-2.4 11.3-2.4 11.5-.8 3.7-3.2 5.6-6.4 5.6-2.4 0-3.2-.8-3.2-2.4 0-.8.8-4.8.8-4.8S7.2 18 7.2 18.3C6.4 21.1 4 22.7 1.6 22.7 1.6 22.7 4 11.3 4 11.1c.8-3.7 3.2-5.6 6.4-5.6 2.4 0 3.2.8 3.2 2.4 0 .8-.8 2.9-.8 2.9z" />
        </svg>
      ),
      instructions: "Project Settings → Custom Code → Head Code",
      code: simpleCode,
      detailedSteps: [
        "Open your Webflow project",
        "Click the gear icon in the top left to open Project Settings",
        "Navigate to the 'Custom Code' tab",
        "Scroll to the 'Head Code' section",
        "Paste the tracking code in the Head Code box",
        "Click 'Save Changes'",
        "Publish your site for changes to take effect"
      ],
      notes: "This method applies tracking to all pages in your Webflow project. No need to add code to individual pages.",
    },
    {
      name: "Squarespace",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M20.1 11.3l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zm-4.2-4.2l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zM11.7 11.3l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zm-4.2 4.2l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zm12.6.9l-3.5 3.5c-.5.5-.5 1.2 0 1.7.5.5 1.2.5 1.7 0l3.5-3.5c.5-.5.5-1.2 0-1.7-.5-.5-1.2-.5-1.7 0z" />
        </svg>
      ),
      instructions: "Settings → Advanced → Code Injection → Header",
      code: simpleCode,
      detailedSteps: [
        "Log in to your Squarespace account",
        "Go to Settings → Advanced → Code Injection",
        "In the 'HEADER' section, paste the tracking code",
        "Click 'Save' at the top of the page",
        "Visit your live site to verify tracking is active"
      ],
      notes: "Code Injection requires a Business plan or higher. If you don't have access, consider upgrading your Squarespace plan.",
    },
    {
      name: "Wix",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M13.444 8.256c-.4.212-.544.562-.544 1.036 0 .504-.03.9-.096 1.272-.636-.24-1.256-.648-1.736-1.14.044-.432.12-.892.28-1.368.256-.78.696-1.456 1.244-2.056h-.004c-.12.132-.24.276-.352.428-.576.752-.972 1.604-1.196 2.52-.232-1.024-.616-1.956-1.176-2.72-.128-.176-.268-.344-.42-.508.548.6.988 1.276 1.244 2.056.16.476.236.936.28 1.368-.48.492-1.1.9-1.736 1.14-.064-.372-.096-.768-.096-1.272 0-.474-.144-.824-.544-1.036-.4 1.224-1.212 1.888-1.852 2.188.64.3 1.452.964 1.852 2.188.4-.212.544-.562.544-1.036 0-.504.028-.9.096-1.272.636.24 1.256.648 1.736 1.14-.044.432-.12.892-.28 1.368-.256.78-.696 1.456-1.244 2.056.12-.132.24-.276.352-.428.576-.752.972-1.604 1.196-2.52.232 1.024.616 1.956 1.176 2.72.128.176.268.344.42.508-.548-.6-.988-1.276-1.244-2.056-.16-.476-.236-.936-.28-1.368.48-.492 1.1-.9 1.736-1.14.064.372.096.768.096 1.272 0 .474.144.824.544 1.036.4-1.224 1.212-1.888 1.852-2.188-.64-.3-1.452-.964-1.852-2.188zm7.04 0c-.4.212-.544.562-.544 1.036 0 .504-.03.9-.096 1.272-.636-.24-1.256-.648-1.736-1.14.044-.432.12-.892.28-1.368.256-.78.696-1.456 1.244-2.056h-.004c-.12.132-.24.276-.352.428-.576.752-.972 1.604-1.196 2.52-.232-1.024-.616-1.956-1.176-2.72-.128-.176-.268-.344-.42-.508.548.6.988 1.276 1.244 2.056.16.476.236.936.28 1.368-.48.492-1.1.9-1.736 1.14-.064-.372-.096-.768-.096-1.272 0-.474-.144-.824-.544-1.036-.4 1.224-1.212 1.888-1.852 2.188.64.3 1.452.964 1.852 2.188.4-.212.544-.562.544-1.036 0-.504.028-.9.096-1.272.636.24 1.256.648 1.736 1.14-.044.432-.12.892-.28 1.368-.256.78-.696 1.456-1.244 2.056.12-.132.24-.276.352-.428.576-.752.972-1.604 1.196-2.52.232 1.024.616 1.956 1.176 2.72.128.176.268.344.42.508-.548-.6-.988-1.276-1.244-2.056-.16-.476-.236-.936-.28-1.368.48-.492 1.1-.9 1.736-1.14.064.372.096.768.096 1.272 0 .474.144.824.544 1.036.4-1.224 1.212-1.888 1.852-2.188-.64-.3-1.452-.964-1.852-2.188z" />
        </svg>
      ),
      instructions: "Settings → Custom Code → Head Code",
      code: simpleCode,
      detailedSteps: [
        "Open your Wix website editor",
        "Click on Settings (gear icon) in the left sidebar",
        "Scroll down and click 'Custom Code' under Advanced",
        "Click '+ Add Custom Code' in the top right",
        "Paste the tracking code in the code snippet box",
        "Name it 'MorrisB Tracking'",
        "Select 'Head' as the placement",
        "Choose 'All pages' for the scope",
        "Click 'Apply' and then publish your site"
      ],
      notes: "Custom Code is available on Premium plans only. Make sure to select 'All pages' to track your entire site.",
    },
    {
      name: "Next.js (App Router)",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M11.214 0c-.3 0-.61.023-.91.065A12.046 12.046 0 002.5 3.278 11.955 11.955 0 00.136 10.5c-.045.3-.068.61-.068.91 0 .3.023.61.068.91.386 2.735 1.772 5.25 3.864 7.028a12.048 12.048 0 007.214 3.218c.3.045.61.068.91.068.3 0 .61-.023.91-.068a12.046 12.046 0 007.214-3.218 11.953 11.953 0 003.864-7.028c.045-.3.068-.61.068-.91 0-.3-.023-.61-.068-.91a11.955 11.955 0 00-3.864-7.028A12.048 12.048 0 0012.124.136c-.3-.045-.61-.068-.91-.068zm-.137 1.636l.007.006c4.654 0 8.682 3.136 9.896 7.636.136.518.228 1.05.273 1.59-.546-.86-1.182-1.682-1.909-2.454L12.87 1.636H11.03zm-2.318.546c-.682.341-1.319.763-1.909 1.227-.227.182-.455.364-.659.568-.136.136-.272.273-.386.41-.159.113-.272.25-.409.386L17.17 16.546c.454-.955.773-1.978.954-3.046.046-.25-.136-.477-.386-.477H8.636c-.386 0-.682-.296-.682-.682s.296-.682.682-.682h7.727c.432 0 .774-.341.774-.773s-.342-.774-.774-.774h-5.681c-.386 0-.682-.295-.682-.681s.296-.682.682-.682h4.09c.41 0 .751-.341.751-.773 0-.409-.34-.773-.75-.773h-2.727c-.409 0-.75-.341-.75-.773 0-.409.341-.773.75-.773h.659c.409 0 .75-.341.75-.773 0-.41-.341-.773-.75-.773h-.819c-.159 0-.318.023-.477.068zM5.716 4.648a10.31 10.31 0 00-2.637 4.477 9.966 9.966 0 00-.386 2.727c0 .796.091 1.59.273 2.363.886 3.773 3.954 6.796 7.773 7.636l8.136-10.272c-.841-1.046-1.864-1.955-3.023-2.705L5.716 4.648z" />
        </svg>
      ),
      instructions: "Add Script component to app/layout.tsx",
      code: `// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* MorrisB Tracking */}
        <Script src="${backendUrl}/track.js" strategy="afterInteractive" />
        <Script id="morrisb-init" strategy="afterInteractive">
          {/*
            window.addEventListener('load', function() {
              if (window.morrisb) {
                morrisb('${workspaceId}', {
                  apiEndpoint: '${backendUrl}'
                });
              }
            });
          */}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}`,
      detailedSteps: [
        "Open app/layout.tsx in your Next.js project",
        "Import Script from 'next/script' at the top of the file",
        "Add both Script components inside the <head> section",
        "Use strategy='afterInteractive' for optimal performance",
        "Save the file (Next.js will auto-reload)",
        "Verify tracking works by checking browser console"
      ],
      notes: "✅ This is the recommended approach for Next.js 13+ with App Router. The Script component automatically handles loading order and optimization.",
    },
    {
      name: "Next.js (Pages Router)",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M11.214 0c-.3 0-.61.023-.91.065A12.046 12.046 0 002.5 3.278 11.955 11.955 0 00.136 10.5c-.045.3-.068.61-.068.91 0 .3.023.61.068.91.386 2.735 1.772 5.25 3.864 7.028a12.048 12.048 0 007.214 3.218c.3.045.61.068.91.068.3 0 .61-.023.91-.068a12.046 12.046 0 007.214-3.218 11.953 11.953 0 003.864-7.028c.045-.3.068-.61.068-.91 0-.3-.023-.61-.068-.91a11.955 11.955 0 00-3.864-7.028A12.048 12.048 0 0012.124.136c-.3-.045-.61-.068-.91-.068zm-.137 1.636l.007.006c4.654 0 8.682 3.136 9.896 7.636.136.518.228 1.05.273 1.59-.546-.86-1.182-1.682-1.909-2.454L12.87 1.636H11.03zm-2.318.546c-.682.341-1.319.763-1.909 1.227-.227.182-.455.364-.659.568-.136.136-.272.273-.386.41-.159.113-.272.25-.409.386L17.17 16.546c.454-.955.773-1.978.954-3.046.046-.25-.136-.477-.386-.477H8.636c-.386 0-.682-.296-.682-.682s.296-.682.682-.682h7.727c.432 0 .774-.341.774-.773s-.342-.774-.774-.774h-5.681c-.386 0-.682-.295-.682-.681s.296-.682.682-.682h4.09c.41 0 .751-.341.751-.773 0-.409-.34-.773-.75-.773h-2.727c-.409 0-.75-.341-.75-.773 0-.409.341-.773.75-.773h.659c.409 0 .75-.341.75-.773 0-.41-.341-.773-.75-.773h-.819c-.159 0-.318.023-.477.068zM5.716 4.648a10.31 10.31 0 00-2.637 4.477 9.966 9.966 0 00-.386 2.727c0 .796.091 1.59.273 2.363.886 3.773 3.954 6.796 7.773 7.636l8.136-10.272c-.841-1.046-1.864-1.955-3.023-2.705L5.716 4.648z" />
        </svg>
      ),
      instructions: "Add Script component to pages/_app.tsx",
      code: `// pages/_app.tsx
import type { AppProps } from 'next/app'
import Script from 'next/script'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* MorrisB Tracking */}
      <Script src="${backendUrl}/track.js" strategy="afterInteractive" />
      <Script id="morrisb-init" strategy="afterInteractive">
        {/*
          window.addEventListener('load', function() {
            if (window.morrisb) {
              morrisb('${workspaceId}', {
                apiEndpoint: '${backendUrl}'
              });
            }
          });
        */}
      </Script>
      <Component {...pageProps} />
    </>
  )
}`,
      detailedSteps: [
        "Open pages/_app.tsx in your Next.js project",
        "Import Script from 'next/script'",
        "Add the Script components before <Component {...pageProps} />",
        "strategy='afterInteractive' loads after page becomes interactive",
        "Save and Next.js will hot-reload automatically",
        "Test by visiting any page and checking console"
      ],
      notes: "✅ For Next.js with Pages Router (versions 12 and below, or if not using App Router). This loads on every page automatically.",
    },
    {
      name: "React (Vite)",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 4.15c1.88 0 3.63.38 5.13 1.03C18.69 5.88 20 6.84 20 8c0 1.16-1.31 2.12-2.87 2.82-1.5.65-3.25 1.03-5.13 1.03s-3.63-.38-5.13-1.03C5.31 10.12 4 9.16 4 8c0-1.16 1.31-2.12 2.87-2.82C8.37 4.53 10.12 4.15 12 4.15m0-1.15c-4.4 0-8 1.79-8 4s3.6 4 8 4 8-1.79 8-4-3.6-4-8-4zm-6 8.15c.94 1.63 2.91 3.39 5.29 4.72 1.63.91 3.24 1.49 4.58 1.49.74 0 1.43-.16 2.03-.51 1.16-.67 1.79-1.88 1.79-3.4 0-1.88-.76-4.09-2.03-5.91-.63-.91-1.33-1.73-2.06-2.42C14.19 3.82 12.94 3 12 3c-.94 0-2.19.82-3.6 2.17-.73.69-1.43 1.51-2.06 2.42C5.07 9.41 4.31 11.62 4.31 13.5c0 1.52.63 2.73 1.79 3.4.6.35 1.29.51 2.03.51 1.34 0 2.95-.58 4.58-1.49 2.38-1.33 4.35-3.09 5.29-4.72m-6 16c-4.4 0-8-1.79-8-4s3.6-4 8-4 8 1.79 8 4-3.6 4-8 4z" />
        </svg>
      ),
      instructions: "Add to index.html in the <head> section",
      code: `<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your App</title>

    <!-- MorrisB Tracking -->
    <script src="${backendUrl}/track.js" async></script>
    <script>
      window.addEventListener('load', function() {
        if (window.morrisb) {
          morrisb('${workspaceId}', {
            apiEndpoint: '${backendUrl}'
          });
        }
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      detailedSteps: [
        "Open index.html in the root of your Vite project",
        "Find the <head> section",
        "Paste the tracking code before the closing </head> tag",
        "Save the file",
        "Vite will auto-reload your dev server",
        "Tracking will work immediately on all pages"
      ],
      notes: "✅ This is the standard approach for Vite + React. The tracking script loads on every page because it's in the root HTML template.",
    },
    {
      name: "Create React App",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 4.15c1.88 0 3.63.38 5.13 1.03C18.69 5.88 20 6.84 20 8c0 1.16-1.31 2.12-2.87 2.82-1.5.65-3.25 1.03-5.13 1.03s-3.63-.38-5.13-1.03C5.31 10.12 4 9.16 4 8c0-1.16 1.31-2.12 2.87-2.82C8.37 4.53 10.12 4.15 12 4.15m0-1.15c-4.4 0-8 1.79-8 4s3.6 4 8 4 8-1.79 8-4-3.6-4-8-4zm-6 8.15c.94 1.63 2.91 3.39 5.29 4.72 1.63.91 3.24 1.49 4.58 1.49.74 0 1.43-.16 2.03-.51 1.16-.67 1.79-1.88 1.79-3.4 0-1.88-.76-4.09-2.03-5.91-.63-.91-1.33-1.73-2.06-2.42C14.19 3.82 12.94 3 12 3c-.94 0-2.19.82-3.6 2.17-.73.69-1.43 1.51-2.06 2.42C5.07 9.41 4.31 11.62 4.31 13.5c0 1.52.63 2.73 1.79 3.4.6.35 1.29.51 2.03.51 1.34 0 2.95-.58 4.58-1.49 2.38-1.33 4.35-3.09 5.29-4.72m-6 16c-4.4 0-8-1.79-8-4s3.6-4 8-4 8 1.79 8 4-3.6 4-8 4z" />
        </svg>
      ),
      instructions: "Add to public/index.html",
      code: `<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your App</title>

    <!-- MorrisB Tracking -->
    <script src="${backendUrl}/track.js" async></script>
    <script>
      window.addEventListener('load', function() {
        if (window.morrisb) {
          morrisb('${workspaceId}', {
            apiEndpoint: '${backendUrl}'
          });
        }
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
      detailedSteps: [
        "Open public/index.html in your Create React App project",
        "Locate the <head> section",
        "Paste the tracking code before </head>",
        "Save the file",
        "Restart your development server (npm start)",
        "Tracking will be active on all routes"
      ],
      notes: "✅ For Create React App, always use public/index.html for third-party scripts. Don't use dangerouslySetInnerHTML - that's an anti-pattern for this use case.",
    },
    {
      name: "Vue / Nuxt",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M2 3h3.5L12 15l6.5-12H22L12 21L2 3m4.5 0h3L12 7.58L14.5 3h3L12 13.08L6.5 3z" />
        </svg>
      ),
      instructions: "Add to nuxt.config.js or main template",
      code: simpleCode,
      detailedSteps: [
        "Open nuxt.config.js (or nuxt.config.ts) in your project",
        "Add the tracking script to the 'head.script' array",
        "Alternatively, create a plugin file in plugins/morrisb.client.js",
        "Add the tracking initialization code to the plugin",
        "Restart your Nuxt dev server",
        "Build and deploy your application"
      ],
      notes: "For Nuxt 3, use app.vue or app/layouts/default.vue. Make sure the script loads only on client-side by using .client suffix.",
      codeExample: `// nuxt.config.js
export default {
  head: {
    script: [
      { src: '${backendUrl}/track.js', async: true },
      {
        innerHTML: \`
          window.addEventListener('load', function() {
            if (window.morrisb) {
              morrisb('${workspaceId}', {
                apiEndpoint: '${backendUrl}'
              });
            }
          });
        \`
      }
    ]
  }
}`,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Section - Compact Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Website Tracking Script</h1>
              <p className="text-white/90 text-base leading-relaxed">
                One powerful snippet that automatically captures visitor behavior, engagement signals, and converts anonymous visitors into qualified leads.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="text-2xl mb-1.5">🎯</div>
              <div className="font-semibold text-base mb-0.5">9 Core Features</div>
              <div className="text-white/80 text-xs">Automatic lead generation</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="text-2xl mb-1.5">📝</div>
              <div className="font-semibold text-base mb-0.5">Smart Forms</div>
              <div className="text-white/80 text-xs">Auto-detect & identify</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="text-2xl mb-1.5">🌐</div>
              <div className="font-semibold text-base mb-0.5">Universal</div>
              <div className="text-white/80 text-xs">Works on any platform</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selection - Modern Design */}
      <div className="flex items-center justify-center">
        <div className="inline-flex gap-2 p-1.5 bg-muted rounded-xl shadow-inner">
          <button
            onClick={() => setSelectedTab("simple")}
            className={cn(
              "px-8 py-3 rounded-lg font-semibold transition-all duration-200",
              selectedTab === "simple"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-background"
            )}
          >
            Simple (Recommended)
          </button>
          <button
            onClick={() => setSelectedTab("advanced")}
            className={cn(
              "px-8 py-3 rounded-lg font-semibold transition-all duration-200",
              selectedTab === "advanced"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-background"
            )}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Code Display - Redesigned */}
      <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
        <div className="bg-gradient-to-r from-primary/90 to-primary px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CodeBracketIcon className="w-6 h-6 text-white" />
            <div>
              <div className="text-white font-bold text-lg">
                {selectedTab === "simple" ? "Universal Tracking Code" : "Advanced Configuration"}
              </div>
              <div className="text-white/70 text-sm">
                {selectedTab === "simple" ? "Copy & paste anywhere" : "With optional features"}
              </div>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(selectedTab === "simple" ? simpleCode : advancedCode)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
          >
            {copied ? (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-5 h-5" />
                Copy Code
              </>
            )}
          </button>
        </div>

        <div className="p-6">
          <pre className="bg-gray-950 text-gray-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {selectedTab === "simple" ? simpleCode : advancedCode}
          </pre>

          {selectedTab === "simple" && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Complete Lead Intelligence - All Automatic!
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      This code automatically captures powerful visitor behavior data without any manual setup.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">🎯 Engagement Tracking</h5>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Scroll depth, time on page, rage clicks, exit intent</p>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h5 className="font-semibold text-purple-900 dark:text-purple-100 text-sm mb-1">📝 Smart Form Detection</h5>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Auto-tracks ALL forms, field interactions, auto-identifies leads</p>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <h5 className="font-semibold text-indigo-900 dark:text-indigo-100 text-sm mb-1">🔗 Link & Download Tracking</h5>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">Outbound links, file downloads, button clicks</p>
                </div>

                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                  <h5 className="font-semibold text-teal-900 dark:text-teal-100 text-sm mb-1">⚡ Performance & Errors</h5>
                  <p className="text-xs text-teal-700 dark:text-teal-300">Page load time, JS errors, user frustration signals</p>
                </div>
              </div>
            </div>
          )}

          {selectedTab === "advanced" && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <SparklesIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Advanced Configuration
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Enable optional features beyond core lead generation. All core features are enabled by default.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-700">
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">✅ Core Features (Always On)</h5>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Forms, scroll, time, engagement, downloads, exit intent, CTAs, UTM</p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h5 className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-1">⚙️ Optional Features</h5>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Outbound links, element visibility, rage clicks, errors, performance</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>Pro Tip:</strong> Start with the simple code. Only use advanced config if you need optional features like error tracking or rage click detection for UX optimization.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform-Specific Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          📚 Platform-Specific Installation Guides
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Click on your platform below for detailed step-by-step instructions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div key={platform.name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedPlatform(expandedPlatform === platform.name ? null : platform.name)}
                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {platform.name}
                      </h4>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedPlatform === platform.name ? 'rotate-180' : ''
                        }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {platform.instructions}
                  </p>
                </button>

                {expandedPlatform === platform.name && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Step-by-Step Instructions:
                    </h5>
                    <ol className="space-y-2 mb-4">
                      {platform.detailedSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>

                    {platform.notes && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-3">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>💡 Note:</strong> {platform.notes}
                        </p>
                      </div>
                    )}

                    {platform.alternativeMethod && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-3">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          <strong>🔄 Alternative:</strong> {platform.alternativeMethod}
                        </p>
                      </div>
                    )}

                    {platform.codeExample && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Code Example:</p>
                        <pre className="bg-gray-900 text-gray-400 p-3 rounded text-xs overflow-x-auto">
                          {platform.codeExample}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Test File Download */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          🧪 Test Before Installing
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Download a pre-configured test page to verify tracking works before installing on your real website. This is the recommended first step!
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <TrackingTestFile workspaceId={workspaceId} />
            <span className="text-sm text-gray-500">
              Open the downloaded HTML file in your browser to test tracking
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-emerald-300 dark:border-emerald-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">What to expect when you open the test file:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>You'll see a green "Tracking is working!" message if everything is set up correctly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Your Visitor ID and Session ID will be displayed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Click the test buttons to simulate form submissions and custom events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Check your browser console (F12) for detailed tracking logs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Visit the Visitors Dashboard (link below) to see the tracked visitor appear within 30 seconds</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verification & Monitoring */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          📊 Monitor Your Visitors & Verify Installation
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          After installing the tracking code, visit your Visitors Dashboard to see real-time tracking data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-300 dark:border-blue-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">✅ How to verify it's working:</h4>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>Install the tracking code on your website</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>Visit your website in a new incognito/private browser window</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>Open browser console (F12) and look for "MorrisB tracking initialized!"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">4.</span>
                <span>Check the Visitors Dashboard below - you should see a new anonymous visitor</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">5.</span>
                <span>Submit a form with your email to test lead identification</span>
              </li>
            </ol>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-300 dark:border-blue-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">🔍 What you'll see in the dashboard:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📈</span>
                <span><strong>Total Visitors:</strong> Count of all tracked visitors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600">👤</span>
                <span><strong>Anonymous Visitors:</strong> Visitors who haven't filled out forms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>Identified Visitors:</strong> Leads who submitted forms with email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">%</span>
                <span><strong>Conversion Rate:</strong> Percentage of visitors who became leads</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">📊</span>
                <span><strong>Event Distribution:</strong> Breakdown of all tracked events</span>
              </li>
            </ul>
          </div>
        </div>

        <a
          href={`/projects/${workspaceId}/visitors`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Open Visitors Dashboard
        </a>
      </div>

      {/* Troubleshooting */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          🛠️ Troubleshooting Guide
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Not seeing visitors in your dashboard? Try these solutions:
        </p>

        <div className="space-y-3">
          <details className="bg-white dark:bg-gray-800 rounded-lg border border-amber-300 dark:border-amber-700">
            <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              ❌ Script not loading / Console errors
            </summary>
            <div className="p-4 border-t border-amber-200 dark:border-amber-700 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Check that the script URL is correct: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs">{backendUrl}/track.js</code></li>
                <li>Verify your website can access the tracking server (check CORS settings)</li>
                <li>Clear your browser cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)</li>
                <li>Check browser console (F12) for any error messages</li>
                <li>Make sure you've published/deployed your website changes</li>
                <li>If you see ERR_BLOCKED_BY_CLIENT, disable your ad blocker or rename the script file</li>
              </ul>
            </div>
          </details>

          <details className="bg-white dark:bg-gray-800 rounded-lg border border-amber-300 dark:border-amber-700">
            <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              👤 No visitors appearing in dashboard
            </summary>
            <div className="p-4 border-t border-amber-200 dark:border-amber-700 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Wait 30-60 seconds after visiting your site - data syncs in batches</li>
                <li>Verify the Workspace ID in the code matches your current project</li>
                <li>Check that the backend API endpoint is correct: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs">{backendUrl}</code></li>
                <li>Use an incognito/private browser window to test (avoids caching)</li>
                <li>Check browser console for tracking initialization message</li>
                <li>Verify your firewall/ad blocker isn't blocking the tracking script</li>
              </ul>
            </div>
          </details>

          <details className="bg-white dark:bg-gray-800 rounded-lg border border-amber-300 dark:border-amber-700">
            <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              📝 Forms not being detected / identified
            </summary>
            <div className="p-4 border-t border-amber-200 dark:border-amber-700 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Make sure your form has an <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs">email</code> field with type="email" or name="email"</li>
                <li>Forms loaded via AJAX/React should be detected automatically via MutationObserver</li>
                <li>Try submitting the form - identification happens on submission</li>
                <li>Check that the form has a submit button (not just AJAX on blur)</li>
                <li>Look for form tracking events in browser console</li>
              </ul>
            </div>
          </details>

          <details className="bg-white dark:bg-gray-800 rounded-lg border border-amber-300 dark:border-amber-700">
            <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              🌐 WordPress/Shopify/Platform-specific issues
            </summary>
            <div className="p-4 border-t border-amber-200 dark:border-amber-700 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>WordPress:</strong> Clear all caching plugins (WP Super Cache, W3 Total Cache, etc.)</li>
                <li><strong>WordPress:</strong> Check if theme updates overrode your header.php changes</li>
                <li><strong>Shopify:</strong> Make sure you saved theme.liquid and published the theme</li>
                <li><strong>Webflow:</strong> Ensure you published the site after adding custom code</li>
                <li><strong>Wix/Squarespace:</strong> Verify you have the required premium plan for custom code</li>
                <li><strong>React/Next.js:</strong> Restart your dev server after adding the code</li>
              </ul>
            </div>
          </details>

          <details className="bg-white dark:bg-gray-800 rounded-lg border border-amber-300 dark:border-amber-700">
            <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              ⚡ Tracking slowing down my website
            </summary>
            <div className="p-4 border-t border-amber-200 dark:border-amber-700 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Solutions:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>The script is already optimized with async loading and passive listeners</li>
                <li>If using Advanced mode, disable optional features you don't need (errorTracking, performanceTracking)</li>
                <li>Check your backend API response time - should be &lt;100ms</li>
                <li>Ensure the tracking script is loaded from a fast CDN or your own server</li>
                <li>Normal performance impact is &lt;10ms - if higher, check for network issues</li>
              </ul>
            </div>
          </details>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          3-Step Installation
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Copy the code above
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the "Copy Code" button to copy the tracking snippet
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Paste in your website's &lt;head&gt; section
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add it before the closing &lt;/head&gt; tag (see platform instructions above)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Publish and start tracking!
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Save your changes, publish your site, and watch visitors appear in your dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Lead Gen Features */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
          Core Lead Generation Features (Always Enabled)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          These features are always active with the simple tracking code. No configuration needed!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">📝 Smart Form Tracking</h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>✅ Auto-detect all forms</li>
              <li>✅ Track field interactions</li>
              <li>✅ Form submission tracking</li>
              <li>✅ Auto-identify leads by email</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">📊 Engagement Metrics</h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>✅ Scroll depth (25%, 50%, 75%, 100%)</li>
              <li>✅ Time on page tracking</li>
              <li>✅ Active engagement detection</li>
              <li>✅ Exit intent (desktop only)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">🔗 Download & CTA Tracking</h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>✅ File download tracking (PDF, docs)</li>
              <li>✅ Button & CTA click tracking</li>
              <li>✅ UTM parameter capture</li>
              <li>✅ Referrer tracking</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Optional Advanced Features */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900/50 dark:to-gray-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-amber-600" />
          Optional Advanced Features (Configurable)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enable these features using the Advanced tab configuration for UX optimization and debugging.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">🔗 Outbound Links</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Track clicks to external websites</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">👁️ Element Visibility</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Track when CTAs come into view</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">😡 Rage Clicks</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Detect user frustration signals</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">💀 Dead Clicks</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Track clicks on non-interactive elements</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">📋 Copy Tracking</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Track content copying behavior</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">⚠️ Error Tracking</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Track JavaScript errors & crashes</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">⚡ Performance</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Track page load time metrics</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">🎨 Custom Events</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Manual event tracking API</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Common Questions
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ Will this slow down my website?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No! The script loads asynchronously, uses passive event listeners, and is heavily optimized. Typical impact: &lt;10ms.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ Do I need to configure anything?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nope! Just paste the code and everything works automatically. Forms, buttons, downloads, errors - all tracked instantly.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ Is it GDPR compliant?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! We use localStorage for tracking, no third-party cookies. Anonymous by default until visitor submits a form.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ Can I track multiple websites?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! Use the same tracking code on multiple sites to centralize all your lead data in one dashboard.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ What about dynamically loaded forms?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We use MutationObserver to detect forms added after page load. Works perfectly with React, Vue, and all modern frameworks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
