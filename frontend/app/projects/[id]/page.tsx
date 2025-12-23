"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const { fetchWorkspace } = useWorkspaceStore();

  // Load workspace and agent status
  useEffect(() => {
    if (!workspaceId) return;

    // Load workspace data
    fetchWorkspace(workspaceId).catch(console.error);

    // Redirect to dashboard as default landing page
    router.replace(`/projects/${workspaceId}/dashboard`);
  }, [workspaceId, fetchWorkspace, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading workspace...</p>
      </div>
    </div>
  );
}
