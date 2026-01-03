"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import TrackingTestFile from "./TrackingTestFile";

interface UniversalTrackingInstallerProps {
  workspaceId: string;
}

export default function UniversalTrackingInstaller({
  workspaceId,
}: UniversalTrackingInstallerProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"simple" | "advanced">("simple");
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "checking" | "success" | "error">("pending");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

  // Universal tracking code (works on ANY website)
  const simpleCode = `<!-- MorrisB Lead Tracking - Copy & Paste Anywhere -->
<script src="${frontendUrl}/track.min.js" async></script>
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
<script src="${frontendUrl}/track.min.js" async></script>
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
      icon: "🌐",
      instructions: "Paste before closing </head> tag",
      code: simpleCode,
    },
    {
      name: "WordPress",
      icon: "📝",
      instructions: "Appearance → Theme Editor → header.php (before </head>)",
      code: simpleCode,
    },
    {
      name: "Shopify",
      icon: "🛍️",
      instructions: "Online Store → Themes → Edit Code → theme.liquid (before </head>)",
      code: simpleCode,
    },
    {
      name: "Webflow",
      icon: "⚡",
      instructions: "Project Settings → Custom Code → Head Code",
      code: simpleCode,
    },
    {
      name: "Squarespace",
      icon: "▪️",
      instructions: "Settings → Advanced → Code Injection → Header",
      code: simpleCode,
    },
    {
      name: "Wix",
      icon: "🎨",
      instructions: "Settings → Custom Code → Head Code",
      code: simpleCode,
    },
    {
      name: "React / Next.js",
      icon: "⚛️",
      instructions: "Add to _document.tsx or _app.tsx inside <Head>",
      code: `{/* MorrisB Tracking */}
<script src="${frontendUrl}/track.min.js" async />
<script
  dangerouslySetInnerHTML={{
    __html: \`
      window.addEventListener('load', function() {
        if (window.morrisb) {
          morrisb('${workspaceId}');
        }
      });
    \`,
  }}
/>`,
    },
    {
      name: "Vue / Nuxt",
      icon: "💚",
      instructions: "Add to nuxt.config.js or main template",
      code: simpleCode,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-8 h-8" />
          <h2 className="text-3xl font-bold">Advanced Lead Tracking Script v2.0</h2>
        </div>
        <p className="text-blue-100 text-lg mb-4">
          One powerful code snippet that automatically captures visitor behavior, engagement signals, and converts anonymous visitors into qualified leads.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-3 py-2">
            <span className="text-2xl">🎯</span>
            <span className="text-sm font-medium">9 Core Lead Gen Features</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-3 py-2">
            <span className="text-2xl">📝</span>
            <span className="text-sm font-medium">Auto Form Identification</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-3 py-2">
            <span className="text-2xl">⚙️</span>
            <span className="text-sm font-medium">Optional Advanced Features</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-3">
          <RocketLaunchIcon className="w-5 h-5" />
          <span className="font-medium">Works on: WordPress, Shopify, Webflow, Wix, React, Vue, HTML, and more!</span>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setSelectedTab("simple")}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            selectedTab === "simple"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Simple (Recommended)
        </button>
        <button
          onClick={() => setSelectedTab("advanced")}
          className={`px-6 py-2 rounded-md font-medium transition-all ${
            selectedTab === "advanced"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Advanced
        </button>
      </div>

      {/* Code Display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CodeBracketIcon className="w-5 h-5 text-green-400" />
            <span className="text-white font-medium">
              {selectedTab === "simple" ? "Universal Tracking Code" : "Advanced Tracking Code"}
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(selectedTab === "simple" ? simpleCode : advancedCode)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
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
          <pre className="bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {selectedTab === "simple" ? simpleCode : advancedCode}
          </pre>

          {selectedTab === "simple" && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Complete Lead Intelligence - All Automatic!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-2">
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
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h5 className="font-semibold text-green-900 dark:text-green-100 text-sm mb-1">✅ Core Features (Always On)</h5>
                  <p className="text-xs text-green-700 dark:text-green-300">Forms, scroll, time, engagement, downloads, exit intent, CTAs, UTM</p>
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
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Platform-Specific Instructions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{platform.icon}</span>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {platform.name}
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {platform.instructions}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Test File Download */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          🧪 Test Before Installing
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Download a pre-configured test page to verify tracking works before installing on your real website.
        </p>
        <div className="flex items-center gap-3">
          <TrackingTestFile workspaceId={workspaceId} />
          <span className="text-sm text-gray-500">
            Open the downloaded HTML file in your browser to test tracking
          </span>
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
