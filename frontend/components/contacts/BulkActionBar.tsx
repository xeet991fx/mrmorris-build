"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    SparklesIcon,
    TagIcon,
    BoltIcon,
    TrashIcon,
    RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { useContactStore } from "@/store/useContactStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { apolloApi } from "@/lib/apollo-api";
import { toast } from "sonner";

interface BulkActionBarProps {
    onAddToWorkflow?: () => void;
    onAddToCampaign?: () => void;
    onDelete?: () => void;
}

export function BulkActionBar({
    onAddToWorkflow,
    onAddToCampaign,
    onDelete,
}: BulkActionBarProps) {
    const { selectedContacts, clearSelectedContacts } = useContactStore();
    const { currentWorkspace } = useWorkspaceStore();
    const [isEnriching, setIsEnriching] = useState(false);

    const count = selectedContacts.length;

    const handleBulkEnrich = async () => {
        if (!currentWorkspace?._id || count === 0) return;

        setIsEnriching(true);
        let enriched = 0;
        let failed = 0;

        for (const contactId of selectedContacts) {
            try {
                await apolloApi.enrichContact(currentWorkspace._id, contactId);
                enriched++;
            } catch {
                failed++;
            }
        }

        setIsEnriching(false);

        if (enriched > 0) {
            toast.success(`Enriched ${enriched} contact${enriched > 1 ? 's' : ''}`);
        }
        if (failed > 0) {
            toast.error(`Failed to enrich ${failed} contact${failed > 1 ? 's' : ''}`);
        }

        clearSelectedContacts();
    };

    if (count === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
            >
                <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border shadow-2xl rounded-xl backdrop-blur-xl">
                    {/* Selection count */}
                    <div className="flex items-center gap-2 pr-3 border-r border-border">
                        <span className="text-sm font-medium text-foreground">
                            {count} selected
                        </span>
                        <button
                            onClick={clearSelectedContacts}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Clear selection"
                        >
                            <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        {/* Enrich with Apollo */}
                        <button
                            onClick={handleBulkEnrich}
                            disabled={isEnriching}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            {isEnriching ? "Enriching..." : "Enrich"}
                        </button>

                        {/* Add to Workflow */}
                        {onAddToWorkflow && (
                            <button
                                onClick={onAddToWorkflow}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                                <BoltIcon className="w-4 h-4" />
                                Workflow
                            </button>
                        )}

                        {/* Add to Campaign */}
                        {onAddToCampaign && (
                            <button
                                onClick={onAddToCampaign}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                            >
                                <RocketLaunchIcon className="w-4 h-4" />
                                Campaign
                            </button>
                        )}

                        {/* Tag (placeholder) */}
                        <button
                            onClick={() => toast("Tagging feature coming soon!")}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                            <TagIcon className="w-4 h-4" />
                            Tag
                        </button>

                        {/* Delete */}
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
