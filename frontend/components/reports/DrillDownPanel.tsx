"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { getDrillDownData } from "@/lib/api/reportDashboards";
import { format } from "date-fns";

interface DrillDownPanelProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    definition: any;
    context: {
        groupByValue?: any;
        segmentByValue?: any;
        metricLabel?: string;
    };
}

export default function DrillDownPanel({
    isOpen,
    onClose,
    workspaceId,
    definition,
    context,
}: DrillDownPanelProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);

    const loadData = useCallback(async (reset = false) => {
        if (!definition || !isOpen) return;

        try {
            setLoading(true);
            const currentPage = reset ? 1 : page;

            const result = await getDrillDownData(workspaceId, definition, {
                groupByValue: context.groupByValue,
                segmentByValue: context.segmentByValue,
                page: currentPage,
                limit: 20,
            });

            if (reset) {
                setData(result.data);
                setTotal(result.total);
            } else {
                setData(prev => [...prev, ...result.data]);
            }

            setHasMore(currentPage < result.totalPages);
            if (reset) setPage(2);
            else setPage(p => p + 1);

        } catch (err) {
            console.error("Failed to load drill-down data:", err);
        } finally {
            setLoading(false);
        }
    }, [isOpen, definition, workspaceId, context, page]);

    // Reset and load on open/context change
    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setHasMore(true);
            loadData(true);
        }
    }, [isOpen, context.groupByValue, context.segmentByValue]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatValue = (val: any) => {
        if (!val) return "—";
        if (typeof val === "number") return val.toLocaleString();
        if (val instanceof Date || (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/))) {
            return format(new Date(val), "MMM d, yyyy");
        }
        return String(val);
    };

    // Determine columns based on source
    // This is a simple heuristic; can be improved with a proper schema definition later
    const getColumns = (item: any) => {
        if (!item) return [];
        const common = ["name", "title", "subject", "status", "stage", "value", "priority", "createdAt", "email"];
        return Object.keys(item).filter(k => common.includes(k) || k === "assignee");
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>
                        {definition?.title || "Drill-down"}
                    </SheetTitle>
                    <SheetDescription>
                        {total} records • {context.metricLabel || "Contributing data"}
                        {(context.groupByValue || context.segmentByValue) && (
                            <span className="block mt-1 font-medium text-zinc-700 dark:text-zinc-300">
                                Filter: {[context.groupByValue, context.segmentByValue].filter(Boolean).join(" • ")}
                            </span>
                        )}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4">
                    {data.length > 0 ? (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-medium">
                                    <tr>
                                        {getColumns(data[0]).map(col => (
                                            <th key={col} className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                                {col.replace(/([A-Z])/g, " $1").trim()}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                    {data.map((item, i) => (
                                        <tr key={item._id || i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            {getColumns(data[0]).map(col => (
                                                <td key={`${i}-${col}`} className="px-4 py-3 truncate max-w-[200px]">
                                                    {col === "assignee"
                                                        ? (item.assignee?.name || "Unassigned")
                                                        : formatValue(item[col])
                                                    }
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        !loading && (
                            <div className="text-center py-12 text-zinc-500 text-sm">
                                No records found for this selection.
                            </div>
                        )
                    )}

                    {loading && (
                        <div className="flex justify-center py-4">
                            <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && hasMore && data.length > 0 && (
                        <button
                            onClick={() => loadData(false)}
                            className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        >
                            Load more
                        </button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
