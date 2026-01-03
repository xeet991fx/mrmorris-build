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
      morrisb('${workspaceId}');
    }
  });
</script>`;

  // Advanced code with manual event tracking
  const advancedCode = `<!-- MorrisB Lead Tracking - Advanced -->
<script src="${frontendUrl}/track.min.js" async></script>
<script>
  window.addEventListener('load', function() {
    if (window.morrisb) {
      var tracker = morrisb('${workspaceId}');

      // Track custom button clicks
      document.addEventListener('click', function(e) {
        if (e.target.matches('.track-click')) {
          tracker.trackClick(e.target.innerText);
        }
      });

      // Identify visitor on form submit
      var forms = document.querySelectorAll('form');
      forms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
          var emailInput = form.querySelector('input[type="email"]');
          if (emailInput && emailInput.value) {
            tracker.identify(emailInput.value, {
              firstName: form.querySelector('[name="firstName"]')?.value,
              lastName: form.querySelector('[name="lastName"]')?.value,
              company: form.querySelector('[name="company"]')?.value
            });
          }
        });
      });
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
          <h2 className="text-3xl font-bold">Universal Tracking Code</h2>
        </div>
        <p className="text-blue-100 text-lg mb-6">
          One code snippet that works on ANY website platform. Copy, paste, done!
        </p>
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
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                    Perfect for beginners!
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    This code automatically tracks page views, UTM parameters, and visitor sessions.
                    Just paste it before the closing &lt;/head&gt; tag on your website.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedTab === "advanced" && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <SparklesIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Advanced Features Included:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>Automatic click tracking for elements with class "track-click"</li>
                    <li>Auto-identify visitors when they submit forms</li>
                    <li>Custom event tracking capabilities</li>
                  </ul>
                </div>
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
              No! The script loads asynchronously and is only 4KB (minified). It won't affect your page load speed.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ Do I need to install it on every page?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No! Just add it once to your template/header file, and it will work on all pages automatically.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ Is it GDPR compliant?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! We use localStorage for tracking, no third-party cookies. You can add a cookie banner if required.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              ❓ Can I track multiple websites with one workspace?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! Use the same tracking code on multiple sites to centralize all your lead data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
