"use client";

import { useAgentStore } from "@/store/useAgentStore";
import { BuildingOfficeIcon, UserGroupIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export default function AgentContextDisplay() {
  const { context } = useAgentStore();

  const hasContext = context.workspaceId || Object.values(context.selectedItems).flat().length > 0;

  if (!hasContext) {
    return null;
  }

  const selectedContactsCount = context.selectedItems.contacts?.length || 0;
  const selectedCompaniesCount = context.selectedItems.companies?.length || 0;
  const totalSelected = selectedContactsCount + selectedCompaniesCount;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="border-b border-border bg-muted/30"
      >
        <div className="p-3 space-y-2">
          {/* Workspace */}
          {context.workspaceName && (
            <div className="flex items-center gap-2 text-xs">
              <Squares2X2Icon className="w-4 h-4 text-[#9ACD32] flex-shrink-0" />
              <span className="text-muted-foreground">Workspace:</span>
              <span className="text-foreground font-medium truncate">
                {context.workspaceName}
              </span>
            </div>
          )}

          {/* Current Page */}
          <div className="flex items-center gap-2 text-xs">
            {context.currentPage === "contacts" ? (
              <UserGroupIcon className="w-4 h-4 text-[#9ACD32] flex-shrink-0" />
            ) : (
              <BuildingOfficeIcon className="w-4 h-4 text-[#9ACD32] flex-shrink-0" />
            )}
            <span className="text-muted-foreground">Page:</span>
            <span className="text-foreground font-medium capitalize">
              {context.currentPage}
            </span>
          </div>

          {/* Selected Items */}
          {totalSelected > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#9ACD32]" />
              </div>
              <span className="text-muted-foreground">Selected:</span>
              <span className="text-foreground font-medium">
                {selectedContactsCount > 0 && `${selectedContactsCount} contact${selectedContactsCount > 1 ? 's' : ''}`}
                {selectedContactsCount > 0 && selectedCompaniesCount > 0 && ', '}
                {selectedCompaniesCount > 0 && `${selectedCompaniesCount} ${selectedCompaniesCount > 1 ? 'companies' : 'company'}`}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
