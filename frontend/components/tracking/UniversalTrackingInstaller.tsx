"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

// Updated: No green colors, neutral design
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
    },
    {
      name: "WordPress",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12.158 12.786L9.46 20.625c.806.237 1.657.366 2.54.366 1.047 0 2.051-.18 2.986-.51-.024-.038-.046-.078-.065-.123l-2.76-7.57zM3.009 12c0 3.559 2.068 6.634 5.067 8.092L3.788 8.341C3.289 9.459 3.009 10.696 3.009 12zm15.54.31c0-1.112-.399-1.881-.742-2.48-.456-.742-.883-1.37-.883-2.11 0-.826.627-1.596 1.51-1.596.04 0 .078.005.116.007-1.598-1.464-3.73-2.36-6.05-2.36-3.131 0-5.891 1.61-7.5 4.049.211.007.41.011.579.011.94 0 2.395-.114 2.395-.114.484-.028.54.684.057.74 0 0-.487.058-1.029.086l3.274 9.739 1.968-5.901-1.401-3.838c-.484-.028-.943-.086-.943-.086-.484-.056-.428-.768.056-.74 0 0 1.484.114 2.368.114.94 0 2.397-.114 2.397-.114.486-.028.543.684.058.74 0 0-.488.058-1.03.086l3.25 9.665.897-2.996c.456-1.17.684-2.137.684-2.907z" />
        </svg>
      ),
      instructions: "Appearance → Theme Editor → header.php",
    },
    {
      name: "Shopify",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M15.337 2.126c-.034-.018-.063-.018-.086 0-.022.017-.166.086-.359.189-.107-1.001-.524-1.909-1.245-2.702-.048-.052-.1-.052-.149 0C13.464-.36 13.39-.343 13.316-.308c-.03.017-.06.035-.089.052-.036.017-.071.035-.107.069-.834.499-1.439 1.252-1.786 2.237-.277.776-.396 1.716-.368 2.701-.63.193-1.067.33-1.108.347-.623.189-1.263.381-1.902.577-.015.005-.03.012-.044.02-.521.155-.788.241-.853 1.502-.044.897-1.191 9.148-1.191 9.148l10.14 1.912 4.632-1.035S16.034 2.471 15.948 2.299c-.034-.086-.121-.155-.611-.173zm-1.245.604c-.193.06-.412.121-.659.19-.013-.435-.052-.861-.115-1.27.354.19.629.556.774 1.08zm-1.174-1.08c.074.382.119.782.135 1.197-.372.114-.774.237-1.194.363.229-.946.64-1.367 1.059-1.56zm-.504 3.943l-.659 1.964s-.574-.261-1.263-.261c-1.02 0-1.073.646-1.073.808 0 .888 2.301 1.227 2.301 3.303 0 1.633-.904 2.683-2.127 2.683-1.467 0-2.214-1.167-2.214-1.167l.395-1.313s.76.647 1.401.647c.425 0 .599-.339 .599-.604 0-1.054-1.887-1.105-1.887-3.114 0-1.601.951-3.152 2.877-3.152.741 0 1.105.213 1.105.213l-.455 1.993z" />
        </svg>
      ),
      instructions: "Online Store → Themes → Edit Code → theme.liquid",
    },
    {
      name: "Webflow",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M14.4 10.8s1.6-4.8 1.6-4.9c.8-2.4 2.4-3.5 4.8-3.3 0 0-2.4 11.3-2.4 11.5-.8 3.7-3.2 5.6-6.4 5.6-2.4 0-3.2-.8-3.2-2.4 0-.8.8-4.8.8-4.8S7.2 18 7.2 18.3C6.4 21.1 4 22.7 1.6 22.7 1.6 22.7 4 11.3 4 11.1c.8-3.7 3.2-5.6 6.4-5.6 2.4 0 3.2.8 3.2 2.4 0 .8-.8 2.9-.8 2.9z" />
        </svg>
      ),
      instructions: "Project Settings → Custom Code → Head Code",
    },
    {
      name: "Squarespace",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M20.1 11.3l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zm-4.2-4.2l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zM11.7 11.3l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zm-4.2 4.2l-3.5-3.5c-.5-.5-1.2-.5-1.7 0-.5.5-.5 1.2 0 1.7l3.5 3.5c.5.5 1.2.5 1.7 0 .5-.5.5-1.2 0-1.7zm12.6.9l-3.5 3.5c-.5.5-.5 1.2 0 1.7.5.5 1.2.5 1.7 0l3.5-3.5c.5-.5.5-1.2 0-1.7-.5-.5-1.2-.5-1.7 0z" />
        </svg>
      ),
      instructions: "Settings → Advanced → Code Injection → Header",
    },
    {
      name: "Wix",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M13.444 8.256c-.4.212-.544.562-.544 1.036 0 .504-.03.9-.096 1.272-.636-.24-1.256-.648-1.736-1.14.044-.432.12-.892.28-1.368.256-.78.696-1.456 1.244-2.056h-.004c-.12.132-.24.276-.352.428-.576.752-.972 1.604-1.196 2.52-.232-1.024-.616-1.956-1.176-2.72-.128-.176-.268-.344-.42-.508.548.6.988 1.276 1.244 2.056.16.476.236.936.28 1.368-.48.492-1.1.9-1.736 1.14-.064-.372-.096-.768-.096-1.272 0-.474-.144-.824-.544-1.036-.4 1.224-1.212 1.888-1.852 2.188.64.3 1.452.964 1.852 2.188.4-.212.544-.562.544-1.036 0-.504.028-.9.096-1.272.636.24 1.256.648 1.736 1.14-.044.432-.12.892-.28 1.368-.256.78-.696 1.456-1.244 2.056.12-.132.24-.276.352-.428.576-.752.972-1.604 1.196-2.52.232 1.024.616 1.956 1.176 2.72.128.176.268.344.42.508-.548-.6-.988-1.276-1.244-2.056-.16-.476-.236-.936-.28-1.368.48-.492 1.1-.9 1.736-1.14.064.372.096.768.096 1.272 0 .474.144.824.544 1.036.4-1.224 1.212-1.888 1.852-2.188-.64-.3-1.452-.964-1.852-2.188zm7.04 0c-.4.212-.544.562-.544 1.036 0 .504-.03.9-.096 1.272-.636-.24-1.256-.648-1.736-1.14.044-.432.12-.892.28-1.368.256-.78.696-1.456 1.244-2.056h-.004c-.12.132-.24.276-.352.428-.576.752-.972 1.604-1.196 2.52-.232-1.024-.616-1.956-1.176-2.72-.128-.176-.268-.344-.42-.508.548.6.988 1.276 1.244 2.056.16.476.236.936.28 1.368-.48.492-1.1.9-1.736 1.14-.064-.372-.096-.768-.096-1.272 0-.474-.144-.824-.544-1.036-.4 1.224-1.212 1.888-1.852 2.188.64.3 1.452.964 1.852 2.188.4-.212.544-.562.544-1.036 0-.504.028-.9.096-1.272.636.24 1.256.648 1.736 1.14-.044.432-.12.892-.28 1.368-.256.78-.696 1.456-1.244 2.056.12-.132.24-.276.352-.428.576-.752.972-1.604 1.196-2.52.232 1.024.616 1.956 1.176 2.72.128.176.268.344.42.508-.548-.6-.988-1.276-1.244-2.056-.16-.476-.236-.936-.28-1.368.48-.492 1.1-.9 1.736-1.14.064.372.096.768.096 1.272 0 .474.144.824.544 1.036.4-1.224 1.212-1.888 1.852-2.188-.64-.3-1.452-.964-1.852-2.188z" />
        </svg>
      ),
      instructions: "Settings → Custom Code → Head Code",
    },
    {
      name: "Next.js (App Router)",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M11.214 0c-.3 0-.61.023-.91.065A12.046 12.046 0 002.5 3.278 11.955 11.955 0 00.136 10.5c-.045.3-.068.61-.068.91 0 .3.023.61.068.91.386 2.735 1.772 5.25 3.864 7.028a12.048 12.048 0 007.214 3.218c.3.045.61.068.91.068.3 0 .61-.023.91-.068a12.046 12.046 0 007.214-3.218 11.953 11.953 0 003.864-7.028c.045-.3.068-.61.068-.91 0-.3-.023-.61-.068-.91a11.955 11.955 0 00-3.864-7.028A12.048 12.048 0 0012.124.136c-.3-.045-.61-.068-.91-.068zm-.137 1.636l.007.006c4.654 0 8.682 3.136 9.896 7.636.136.518.228 1.05.273 1.59-.546-.86-1.182-1.682-1.909-2.454L12.87 1.636H11.03zm-2.318.546c-.682.341-1.319.763-1.909 1.227-.227.182-.455.364-.659.568-.136.136-.272.273-.386.41-.159.113-.272.25-.409.386L17.17 16.546c.454-.955.773-1.978.954-3.046.046-.25-.136-.477-.386-.477H8.636c-.386 0-.682-.296-.682-.682s.296-.682.682-.682h7.727c.432 0 .774-.341.774-.773s-.342-.774-.774-.774h-5.681c-.386 0-.682-.295-.682-.681s.296-.682.682-.682h4.09c.41 0 .751-.341.751-.773 0-.409-.34-.773-.75-.773h-2.727c-.409 0-.75-.341-.75-.773 0-.409.341-.773.75-.773h.659c.409 0 .75-.341.75-.773 0-.41-.341-.773-.75-.773h-.819c-.159 0-.318.023-.477.068zM5.716 4.648a10.31 10.31 0 00-2.637 4.477 9.966 9.966 0 00-.386 2.727c0 .796.091 1.59.273 2.363.886 3.773 3.954 6.796 7.773 7.636l8.136-10.272c-.841-1.046-1.864-1.955-3.023-2.705L5.716 4.648z" />
        </svg>
      ),
      instructions: "Add Script to app/layout.tsx",
    },
    {
      name: "Next.js (Pages Router)",
      icon: ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M11.214 0c-.3 0-.61.023-.91.065A12.046 12.046 0 002.5 3.278 11.955 11.955 0 00.136 10.5c-.045.3-.068.61-.068.91 0 .3.023.61.068.91.386 2.735 1.772 5.25 3.864 7.028a12.048 12.048 0 007.214 3.218c.3.045.61.068.91.068.3 0 .61-.023.91-.068a12.046 12.046 0 007.214-3.218 11.953 11.953 0 003.864-7.028c.045-.3.068-.61.068-.91 0-.3-.023-.61-.068-.91a11.955 11.955 0 00-3.864-7.028A12.048 12.048 0 0012.124.136c-.3-.045-.61-.068-.91-.068zm-.137 1.636l.007.006c4.654 0 8.682 3.136 9.896 7.636.136.518.228 1.05.273 1.59-.546-.86-1.182-1.682-1.909-2.454L12.87 1.636H11.03zm-2.318.546c-.682.341-1.319.763-1.909 1.227-.227.182-.455.364-.659.568-.136.136-.272.273-.386.41-.159.113-.272.25-.409.386L17.17 16.546c.454-.955.773-1.978.954-3.046.046-.25-.136-.477-.386-.477H8.636c-.386 0-.682-.296-.682-.682s.296-.682.682-.682h7.727c.432 0 .774-.341.774-.773s-.342-.774-.774-.774h-5.681c-.386 0-.682-.295-.682-.681s.296-.682.682-.682h4.09c.41 0 .751-.341.751-.773 0-.409-.34-.773-.75-.773h-2.727c-.409 0-.75-.341-.75-.773 0-.409.341-.773.75-.773h.659c.409 0 .75-.341.75-.773 0-.41-.341-.773-.75-.773h-.819c-.159 0-.318.023-.477.068zM5.716 4.648a10.31 10.31 0 00-2.637 4.477 9.966 9.966 0 00-.386 2.727c0 .796.091 1.59.273 2.363.886 3.773 3.954 6.796 7.773 7.636l8.136-10.272c-.841-1.046-1.864-1.955-3.023-2.705L5.716 4.648z" />
        </svg>
      ),
      instructions: "Add Script to pages/_app.tsx",
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
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section - Compact with better readable fonts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/30 via-background to-background p-5 border border-border/40"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted/50 rounded-lg">
            <SparklesIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground mb-1">
              Website Tracking Script
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              One powerful snippet that automatically captures visitor behavior, engagement signals, and converts anonymous visitors into qualified leads.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "🎯", title: "9 Core Features" },
                { icon: "📝", title: "Smart Forms" },
                { icon: "🌐", title: "Universal" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30"
                >
                  <span className="text-lg">{feature.icon}</span>
                  <span className="text-xs font-medium text-foreground">{feature.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Selection - Minimal */}
      <div className="flex items-center justify-center">
        <div className="inline-flex gap-1 p-1 bg-muted/40 rounded-lg border border-border/40">
          <motion.button
            onClick={() => setSelectedTab("simple")}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 relative",
              selectedTab === "simple"
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            whileTap={{ scale: 0.98 }}
          >
            {selectedTab === "simple" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Simple (Recommended)</span>
          </motion.button>
          <motion.button
            onClick={() => setSelectedTab("advanced")}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 relative",
              selectedTab === "advanced"
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            whileTap={{ scale: 0.98 }}
          >
            {selectedTab === "advanced" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Advanced</span>
          </motion.button>
        </div>
      </div>

      {/* Code Display - Compact and clean */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-card border border-border/50 overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2">
              <CodeBracketIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {selectedTab === "simple" ? "Universal Tracking Code" : "Advanced Configuration"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedTab === "simple" ? "Copy & paste anywhere" : "With optional features"}
                </div>
              </div>
            </div>
            <motion.button
              onClick={() => copyToClipboard(selectedTab === "simple" ? simpleCode : advancedCode)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="copied"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Copied!
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy Code
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div className="p-4">
            <pre className="bg-gray-950 text-gray-300 p-3 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">
              {selectedTab === "simple" ? simpleCode : advancedCode}
            </pre>

            {selectedTab === "simple" && (
              <div className="mt-3 space-y-2.5">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">✓ All Automatic:</strong> This code captures forms, scroll depth, time on page, downloads, exit intent, and more without any configuration.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { title: "Engagement", desc: "Scroll, time, clicks" },
                    { title: "Smart Forms", desc: "Auto-detect & identify" },
                    { title: "Downloads", desc: "Files & links" },
                    { title: "Performance", desc: "Errors & speed" },
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg bg-muted/20 border border-border/20"
                    >
                      <div className="text-xs font-semibold text-foreground mb-0.5">{feature.title}</div>
                      <div className="text-[11px] text-muted-foreground">{feature.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === "advanced" && (
              <div className="mt-3 space-y-2.5">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Optional Features:</strong> Enable advanced tracking like rage clicks, error tracking, and performance monitoring. All core features are always enabled.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Platform-Specific Instructions - All platforms restored */}
      <div className="rounded-xl bg-card/40 border border-border/40 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Platform-Specific Guides
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Click your platform for detailed instructions
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {platforms.map((platform, index) => {
            const Icon = platform.icon;
            const isExpanded = expandedPlatform === platform.name;
            return (
              <div key={platform.name} className="relative">
                <button
                  onClick={() => setExpandedPlatform(isExpanded ? null : platform.name)}
                  className="w-full p-3 rounded-lg bg-background/60 border border-border/40 hover:border-border transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-foreground line-clamp-1">{platform.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {platform.instructions}
                  </p>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute z-10 left-0 right-0 top-full mt-1 p-3 rounded-lg bg-card border border-border shadow-xl overflow-hidden min-w-[280px]"
                    >
                      <p className="text-xs text-muted-foreground">
                        Detailed steps available in full documentation
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Test & Verification - Compact side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Test File */}
        <div className="rounded-xl bg-muted/20 border border-border/40 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <span>🧪</span> Test First
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Download a test page to verify tracking works
          </p>
          <TrackingTestFile workspaceId={workspaceId} />
        </div>

        {/* Verification */}
        <div className="rounded-xl bg-muted/20 border border-border/40 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <span>📊</span> Verify Installation
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Check your dashboard after installing
          </p>
          <motion.a
            href={`/projects/${workspaceId}/visitors`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>View Dashboard</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.a>
        </div>
      </div>
    </div>
  );
}
