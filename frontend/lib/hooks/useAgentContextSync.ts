"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import { useParams, usePathname } from "next/navigation";

/**
 * Hook to automatically sync agent context with the current workspace, page, and selections
 * Should be called in the main layout or page component
 */
export function useAgentContextSync(
  workspaceName?: string | null,
  currentPage?: "dashboard" | "contacts" | "companies" | "pipelines",
  selectedContacts?: string[],
  selectedCompanies?: string[]
) {
  const { updateContext } = useAgentStore();
  const params = useParams();
  const pathname = usePathname();

  useEffect(() => {
    const workspaceId = params?.id as string | undefined;

    // Determine current page from pathname if not provided
    let page: "dashboard" | "contacts" | "companies" | "pipelines" = currentPage || "dashboard";
    if (!currentPage && pathname) {
      if (pathname.includes("/contacts")) {
        page = "contacts";
      } else if (pathname.includes("/companies")) {
        page = "companies";
      } else if (pathname.includes("/pipelines")) {
        page = "pipelines";
      }
    }

    // Update agent context
    updateContext({
      workspaceId: workspaceId || null,
      workspaceName: workspaceName || null,
      currentPage: page,
      selectedItems: {
        contacts: selectedContacts || [],
        companies: selectedCompanies || [],
      },
    });
  }, [
    params,
    pathname,
    workspaceName,
    currentPage,
    selectedContacts,
    selectedCompanies,
    updateContext,
  ]);
}
