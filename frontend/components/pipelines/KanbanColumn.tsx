import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { PlusIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Opportunity } from "@/lib/api/opportunity";
import OpportunityCardEnhanced from "./OpportunityCardEnhanced";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
    stage: {
        _id: string;
        name: string;
        order: number;
        color: string;
    };
    opportunities: Opportunity[];
    onEdit: (opportunity: Opportunity) => void;
    onDelete: (opportunityId: string) => void;
    onAddOpportunity: (stageId: string) => void;
    onCardClick?: (opportunity: Opportunity) => void;
    isFirst?: boolean;
    isLast?: boolean;
}

export default function KanbanColumn({
    stage,
    opportunities,
    onEdit,
    onDelete,
    onAddOpportunity,
    onCardClick,
    isFirst = false,
    isLast = false,
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage._id,
        data: {
            type: "stage",
            stageId: stage._id,
        },
    });

    // Calculate total value of opportunities in this stage
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}K`;
        }
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="flex-shrink-0 w-[320px] flex flex-col h-full relative">
            {/* Pipeline Flow Header */}
            <div className="mb-3 relative">
                {/* Main Header Bar */}
                <div
                    className={cn(
                        "relative px-4 py-3",
                        "bg-zinc-100 dark:bg-zinc-800/80",
                        isFirst && "rounded-l-lg",
                        isLast && "rounded-r-lg"
                    )}
                    style={{
                        borderBottom: `3px solid ${stage.color}`,
                    }}
                >
                    {/* Chevron Arrow (except for last column) */}
                    {!isLast && (
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                            <ChevronRightIcon className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                        </div>
                    )}

                    {/* Stage Info Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Stage Color Dot */}
                            <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: stage.color }}
                            />
                            {/* Stage Name */}
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                                {stage.name}
                            </h3>
                            {/* Count */}
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                                {opportunities.length}
                            </span>
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={() => onAddOpportunity(stage._id)}
                            className={cn(
                                "p-1 rounded transition-colors flex-shrink-0",
                                "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
                                "hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            )}
                            title="Add opportunity"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Value Row */}
                    <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalValue)}
                        </span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                            pipeline value
                        </span>
                    </div>
                </div>
            </div>

            {/* Droppable Cards Area */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 rounded-lg p-2 space-y-2.5 overflow-y-auto transition-all duration-200",
                    "bg-zinc-50/80 dark:bg-zinc-900/50",
                    "border border-zinc-200 dark:border-zinc-700",
                    isOver
                        ? "ring-2 ring-emerald-400 dark:ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5"
                        : ""
                )}
            >
                {opportunities.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                No opportunities
                            </p>
                            <button
                                onClick={() => onAddOpportunity(stage._id)}
                                className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                                + Add one
                            </button>
                        </div>
                    </div>
                ) : (
                    opportunities.map((opportunity, index) => (
                        <motion.div
                            key={opportunity._id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02, duration: 0.15 }}
                        >
                            <OpportunityCardEnhanced
                                opportunity={opportunity}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onClick={onCardClick}
                            />
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
