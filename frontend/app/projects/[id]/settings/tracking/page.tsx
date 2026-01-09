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

  const methods = [
    {
      id: "universal",
      title: "Universal Code",
      badge: "Recommended",
      description: "One code that works on ANY platform",
      icon: CodeBracketIcon,
      gradient: "from-blue-500/20 to-cyan-500/10",
      iconColor: "text-blue-400",
      difficulty: "Easy",
      setup: "2 minutes",
      bestFor: "All websites",
    },
    {
      id: "landing-pages",
      title: "MorrisB Pages",
      badge: "Automatic",
      description: "Create pages in MorrisB - tracking included!",
      icon: RocketLaunchIcon,
      gradient: "from-emerald-500/20 to-green-500/10",
      iconColor: "text-emerald-400",
      difficulty: "Easy",
      setup: "No setup",
      bestFor: "New campaigns",
    },
    {
      id: "wordpress",
      title: "WordPress",
      badge: "One-Click",
      description: "Install our WordPress plugin",
      icon: CubeIcon,
      gradient: "from-purple-500/20 to-violet-500/10",
      iconColor: "text-purple-400",
      difficulty: "Easy",
      setup: "2 minutes",
      bestFor: "WordPress sites",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="px-8 pt-8 pb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <CodeBracketIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Website Tracking</h1>
            <p className="text-sm text-muted-foreground">
              Choose how to track visitors and generate leads
            </p>
          </div>
        </div>
      </motion.div>

      <div className="px-8 pb-8 max-w-4xl">
        {/* Method Selection */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <motion.button
                key={method.id}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMethod(method.id)}
                className={`relative p-5 rounded-2xl text-left transition-all duration-500 ${isSelected
                    ? "shadow-lg"
                    : "hover:shadow-md"
                  }`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${method.gradient} transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-50"
                  }`} />

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="selectedMethod"
                    className="absolute inset-0 rounded-2xl ring-2 ring-primary/50"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <div className="relative z-10">
                  {/* Badge */}
                  <span className={`inline-block px-2.5 py-1 text-[10px] font-semibold rounded-full mb-4 ${method.badge === "Recommended"
                      ? "bg-blue-500/20 text-blue-400"
                      : method.badge === "Automatic"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}>
                    {method.badge}
                  </span>

                  {/* Icon */}
                  <Icon className={`w-7 h-7 mb-3 ${method.iconColor}`} />

                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {method.title}
                  </h3>

                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                    {method.description}
                  </p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{method.setup}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      {method.difficulty}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Selected Method Details */}
        {selectedMethod === "universal" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <UniversalTrackingInstaller workspaceId={workspaceId} />
          </motion.div>
        )}

        {selectedMethod === "landing-pages" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <CheckIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Tracking is Automatic!
                </h2>
                <p className="text-muted-foreground">
                  Landing pages built in MorrisB track visitors automatically
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-foreground">How it works:</h3>
              <div className="space-y-3">
                {[
                  { step: 1, title: "Create a landing page", desc: "Marketing → Pages → Create New" },
                  { step: 2, title: "Add a form", desc: "Drag a form section onto your page" },
                  { step: 3, title: "Publish & share", desc: "Share the link and tracking starts!" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-emerald-500 text-white rounded-full text-sm font-semibold">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={`/projects/${workspaceId}/pages/new`}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300"
              >
                Create Landing Page
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={`/projects/${workspaceId}/visitors`}
                className="px-6 py-3 rounded-xl bg-muted/50 text-foreground font-medium hover:bg-muted transition-all duration-300"
              >
                View Visitors
              </motion.a>
            </div>
          </motion.div>
        )}

        {selectedMethod === "wordpress" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-8"
          >
            <h2 className="text-xl font-bold text-foreground mb-6">
              WordPress Plugin - One-Click Setup
            </h2>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 text-sm text-foreground">
                <strong>✨ Automatic Installation:</strong> Install our WordPress plugin and tracking starts immediately!
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Installation Steps:</h3>
                <div className="space-y-3">
                  {[
                    { step: 1, title: "Download the plugin", link: true },
                    { step: 2, title: "Upload to WordPress", desc: "Plugins → Add New → Upload Plugin" },
                    { step: 3, title: "Activate & configure", desc: "Settings → MorrisB Tracking → Enter Workspace ID" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-purple-500 text-white rounded-full text-sm font-semibold">
                        {item.step}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        {item.link && (
                          <a
                            href="/morrisb-tracking.zip"
                            download="morrisb-tracking.zip"
                            className="text-sm text-primary hover:underline"
                          >
                            Download morrisb-tracking.zip
                          </a>
                        )}
                        {item.desc && (
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Your Workspace ID
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={workspaceId}
                    readOnly
                    className="flex-1 px-4 py-2.5 rounded-xl bg-background/60 backdrop-blur-sm font-mono text-sm text-foreground"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigator.clipboard.writeText(workspaceId)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
                  >
                    Copy
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
