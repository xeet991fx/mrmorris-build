"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

  const methods = [
    {
      id: "universal",
      title: "Universal Code",
      badge: "Recommended",
      description: "One code that works on ANY platform",
      icon: CodeBracketIcon,
      gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
      iconColor: "text-blue-500",
      badgeBg: "bg-blue-500/10",
      badgeText: "text-blue-600",
      difficulty: "Easy",
      setup: "2 minutes",
    },
    {
      id: "landing-pages",
      title: "MorrisB Pages",
      badge: "Automatic",
      description: "Create pages in MorrisB - tracking included!",
      icon: RocketLaunchIcon,
      gradient: "from-purple-500/10 via-pink-500/5 to-transparent",
      iconColor: "text-purple-500",
      badgeBg: "bg-purple-500/10",
      badgeText: "text-purple-600",
      difficulty: "Easy",
      setup: "No setup",
    },
    {
      id: "wordpress",
      title: "WordPress",
      badge: "One-Click",
      description: "Install our WordPress plugin",
      icon: CubeIcon,
      gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
      iconColor: "text-amber-500",
      badgeBg: "bg-amber-500/10",
      badgeText: "text-amber-600",
      difficulty: "Easy",
      setup: "2 minutes",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/50">
            <CodeBracketIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Website Tracking
            </h1>
            <p className="text-xs text-muted-foreground">
              Choose how to track visitors and generate leads
            </p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 pb-6 max-w-5xl mx-auto">
        {/* Method Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <motion.button
                key={method.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMethod(method.id)}
                className={`relative p-4 rounded-lg text-left transition-all duration-200 border ${isSelected
                    ? "bg-card border-border shadow-sm"
                    : "bg-card/40 border-border/40 hover:border-border/60"
                  }`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${method.gradient} ${isSelected ? "opacity-100" : "opacity-50"
                  }`} />

                {/* Content */}
                <div className="relative">
                  {/* Badge */}
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded mb-2 ${method.badgeBg} ${method.badgeText}`}>
                    {method.badge}
                  </span>

                  {/* Icon */}
                  <Icon className={`w-7 h-7 mb-2 ${method.iconColor}`} />

                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {method.title}
                  </h3>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {method.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{method.setup}</span>
                    <span className="px-2 py-0.5 rounded bg-muted/50 text-muted-foreground font-medium">
                      {method.difficulty}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selected Method Details */}
        <AnimatePresence mode="wait">
          {selectedMethod === "universal" && (
            <motion.div
              key="universal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UniversalTrackingInstaller workspaceId={workspaceId} />
            </motion.div>
          )}

          {selectedMethod === "landing-pages" && (
            <motion.div
              key="landing-pages"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl bg-card border border-border/50 p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <CheckIcon className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Tracking is Automatic!
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Landing pages built in MorrisB track visitors automatically
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <h3 className="font-medium text-foreground text-sm">How it works:</h3>
                <div className="space-y-2">
                  {[
                    { step: 1, title: "Create a landing page", desc: "Marketing → Pages → Create New" },
                    { step: 2, title: "Add a form", desc: "Drag a form section onto your page" },
                    { step: 3, title: "Publish & share", desc: "Share the link and tracking starts!" },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/30"
                    >
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded text-[10px] font-bold">
                        {item.step}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={`/projects/${workspaceId}/pages/new`}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Create Landing Page
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={`/projects/${workspaceId}/visitors`}
                  className="px-4 py-2 rounded-lg bg-muted/50 text-foreground text-xs font-medium hover:bg-muted transition-colors"
                >
                  View Visitors
                </motion.a>
              </div>
            </motion.div>
          )}

          {selectedMethod === "wordpress" && (
            <motion.div
              key="wordpress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl bg-card border border-border/50 p-5"
            >
              <h2 className="text-base font-semibold text-foreground mb-4">
                WordPress Plugin - One-Click Setup
              </h2>

              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-500/10 text-xs text-foreground border border-amber-500/20">
                  <strong>✨ Automatic Installation:</strong> Install our WordPress plugin and tracking starts immediately!
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-foreground text-sm">Installation Steps:</h3>
                  <div className="space-y-2">
                    {[
                      { step: 1, title: "Download the plugin", link: true },
                      { step: 2, title: "Upload to WordPress", desc: "Plugins → Add New → Upload Plugin" },
                      { step: 3, title: "Activate & configure", desc: "Settings → MorrisB Tracking → Enter Workspace ID" },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className="flex items-start gap-2 p-2 rounded-lg bg-muted/30"
                      >
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-amber-500 text-white rounded text-[10px] font-bold">
                          {item.step}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-foreground">{item.title}</p>
                          {item.link && (
                            <a
                              href="/morrisb-tracking.zip"
                              download="morrisb-tracking.zip"
                              className="text-[10px] text-primary hover:underline"
                            >
                              Download morrisb-tracking.zip
                            </a>
                          )}
                          {item.desc && (
                            <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Your Workspace ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={workspaceId}
                      readOnly
                      className="flex-1 px-3 py-2 rounded-lg bg-background font-mono text-xs text-foreground border border-border"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigator.clipboard.writeText(workspaceId)}
                      className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      Copy
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
