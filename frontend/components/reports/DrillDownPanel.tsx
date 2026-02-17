"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { getDrillDownData } from "@/lib/api/reportDashboards";
import { format } from "date-fns";
import { ArrowTopRightOnSquareIcon, ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [filterText, setFilterText] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) {
                setPage(1);
                setHasMore(true);
                loadData(true);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [filterText]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reload on sort change
    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setHasMore(true);
            loadData(true);
        }
    }, [sortColumn, sortDirection]); // eslint-disable-line react-hooks/exhaustive-deps

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
                sort: sortColumn ? { field: sortColumn, direction: sortDirection } : undefined,
                search: filterText || undefined,
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
    }, [isOpen, definition, workspaceId, context, page, sortColumn, sortDirection, filterText]);

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

    // Get record detail URL based on definition source
    const getRecordUrl = (item: any) => {
        if (!item._id || !definition?.source) return null;

        const source = definition.source.toLowerCase();

        if (source === "deals" || source === "deal") {
            return `/projects/${workspaceId}/deals/${item._id}`;
        } else if (source === "contacts" || source === "contact") {
            return `/projects/${workspaceId}/contacts/${item._id}`;
        } else if (source === "tasks" || source === "task") {
            return `/projects/${workspaceId}/tasks/${item._id}`;
        } else if (source === "activities" || source === "activity") {
            return `/projects/${workspaceId}/activities/${item._id}`;
        } else if (source === "emails" || source === "email") {
            return `/projects/${workspaceId}/emails/${item._id}`;
        }

        return null;
    };

    const handleRowClick = (item: any) => {
        const url = getRecordUrl(item);
        if (url) {
            router.push(url);
        }
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    // Server-side filtering/sorting is now used.
    // We use 'data' directly.
    const filteredAndSortedData = data;

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
                    {/* Filter input */}
                    {data.length > 0 && (
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Filter records..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                    )}

                    {data.length > 0 ? (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-medium">
                                        <tr>
                                            {getColumns(data[0]).map(col => (
                                                <th
                                                    key={col}
                                                    onClick={() => handleSort(col)}
                                                    className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors select-none"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{col.replace(/([A-Z])/g, " $1").trim()}</span>
                                                        {sortColumn === col && (
                                                            sortDirection === "asc" ? (
                                                                <ChevronUpIcon className="w-3 h-3" />
                                                            ) : (
                                                                <ChevronDownIcon className="w-3 h-3" />
                                                            )
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                        {filteredAndSortedData.length > 0 ? (
                                            filteredAndSortedData.map((item, i) => {
                                                const recordUrl = getRecordUrl(item);
                                                const isClickable = !!recordUrl;

                                                return (
                                                    <tr
                                                        key={item._id || i}
                                                        onClick={() => isClickable && handleRowClick(item)}
                                                        className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors ${isClickable ? "cursor-pointer group" : ""}`}
                                                    >
                                                        {getColumns(data[0]).map((col, colIndex) => (
                                                            <td key={`${i}-${col}`} className="px-4 py-3 truncate max-w-[200px]">
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    {col === "assignee"
                                                                        ? (item.assignee?.name || "Unassigned")
                                                                        : formatValue(item[col])
                                                                    }
                                                                    {isClickable && colIndex === 0 && (
                                                                        <ArrowTopRightOnSquareIcon className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    )}
                                                                </span>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={getColumns(data[0]).length} className="px-4 py-8 text-center text-zinc-500 text-sm">
                                                    No records match your filter.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
