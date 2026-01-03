"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckIcon,
  RocketLaunchIcon,
  CodeBracketIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import UniversalTrackingInstaller from "@/components/tracking/UniversalTrackingInstaller";

export default function TrackingSettingsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [selectedMethod, setSelectedMethod] = useState<string | null>("universal");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  const methods = [
    {
      id: "universal",
      title: "Universal Code (Recommended)",
      description: "One code that works on ANY platform - easiest way!",
      icon: CodeBracketIcon,
      color: "blue",
      difficulty: "Easy",
      setup: "2 minutes",
      bestFor: "All websites - WordPress, Shopify, Webflow, React, HTML",
      automatic: false,
    },
    {
      id: "landing-pages",
      title: "Use MorrisB Landing Pages",
      description: "Create landing pages in MorrisB - tracking is automatic!",
      icon: RocketLaunchIcon,
      color: "green",
      difficulty: "Easy",
      setup: "No setup required",
      bestFor: "New campaigns, lead magnets, product launches",
      automatic: true,
    },
    {
      id: "wordpress",
      title: "WordPress Plugin",
      description: "Install our WordPress plugin - one-click setup!",
      icon: CubeIcon,
      color: "purple",
      difficulty: "Easy",
      setup: "2 minutes",
      bestFor: "WordPress sites only",
      automatic: true,
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "text-green-600 bg-green-100";
      case "Medium": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Website Tracking
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how you want to track visitors and generate leads
        </p>
      </div>

      {/* Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <motion.button
              key={method.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedMethod(method.id)}
              className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {method.automatic && (
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                    Automatic
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className={`inline-flex p-3 rounded-lg bg-${method.color}-100 dark:bg-${method.color}-900/20`}>
                  <Icon className={`w-6 h-6 text-${method.color}-600`} />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {method.title}
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {method.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Difficulty:</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(method.difficulty)}`}>
                    {method.difficulty}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Setup:</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {method.setup}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Method Details */}
      {selectedMethod === "universal" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <UniversalTrackingInstaller workspaceId={workspaceId} />
        </motion.div>
      )}

      {selectedMethod === "landing-pages" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-md p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-600 rounded-lg">
              <CheckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Perfect! Tracking is Already Automatic
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Landing pages built in MorrisB track visitors automatically
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              How it works:
            </h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded-full text-sm font-semibold">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Create a landing page
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Go to Marketing → Pages → Create New Page
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded-full text-sm font-semibold">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Add a form
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag a form section onto your page
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded-full text-sm font-semibold">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Publish & share
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share the link and tracking starts automatically!
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`/projects/${workspaceId}/pages/new`}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Create Landing Page
            </a>
            <a
              href={`/projects/${workspaceId}/visitors`}
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              View Visitors
            </a>
          </div>
        </motion.div>
      )}

      {selectedMethod === "wordpress" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            WordPress Plugin - One-Click Setup
          </h2>

          <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>✨ Automatic Installation:</strong> Install our WordPress plugin and tracking starts working immediately - no coding required!
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Installation Steps:
              </h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-semibold">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Download the plugin
                    </p>
                    <a
                      href="/morrisb-tracking.zip"
                      download="morrisb-tracking.zip"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Download morrisb-tracking.zip
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-semibold">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Upload to WordPress
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Plugins → Add New → Upload Plugin → Choose File
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-semibold">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Activate & configure
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Activate plugin → Settings → MorrisB Tracking → Enter Workspace ID
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Workspace ID (copy this):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={workspaceId}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(workspaceId)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
