"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SparklesIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { format } from "date-fns";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const { currentWorkspace, fetchWorkspace, isLoading } = useWorkspaceStore();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    const loadWorkspace = async () => {
      try {
        await fetchWorkspace(workspaceId);
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch workspace:", error);
          setIsInitialLoading(false);
        }
      }
    };

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, fetchWorkspace]);

  if (isInitialLoading || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 pt-14 pb-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-5 flex items-center gap-2 text-sm"
      >
        <button
          onClick={() => router.push("/projects")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Workspaces
        </button>
        <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">{currentWorkspace.name}</span>
      </motion.div>

      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center min-h-[500px]"
      >
        <div className="max-w-2xl w-full">
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-[#9ACD32] to-[#7BA428] rounded-xl flex items-center justify-center mx-auto mb-5">
              <SparklesIcon className="w-8 h-8 text-neutral-900" />
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome to {currentWorkspace.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              Your workspace was created on {format(new Date(currentWorkspace.createdAt), "MMMM d, yyyy")}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              This is your autonomous marketing workspace. Start building amazing campaigns!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push("/projects")}
                className="px-6 py-2.5 bg-[#9ACD32] text-neutral-900 font-medium text-sm rounded-lg shadow-sm hover:shadow hover:bg-[#8AB82E] transition-all"
              >
                Back to Workspaces
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
