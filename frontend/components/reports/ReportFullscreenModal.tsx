"use client";

/**
 * ReportFullscreenModal - Fullscreen Report View
 *
 * Opens a report in a full-screen modal with expanded chart,
 * navigation between reports, and data table.
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";
import { getReportData } from "@/lib/api/reportDashboards";
import { adaptReportData } from "@/lib/reportDataAdapters";
import CalculatedValuesTable from "./CalculatedValuesTable";

// Import chart widgets from ReportWidget — we'll use dynamic import or share later
// For now we inline their rendering through the parent

interface ReportFullscreenModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: any;
    reports: any[]; // All reports for prev/next navigation
    workspaceId: string;
    renderChart: (data: any, report: any) => React.ReactNode;
}

export default function ReportFullscreenModal({
    isOpen,
    onClose,
    report,
    reports,
    workspaceId,
    renderChart,
}: ReportFullscreenModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const currentReport = useMemo(() => reports[currentIndex] || report, [reports, currentIndex, report]);

    // Find initial index
    useEffect(() => {
        if (report && reports.length > 0) {
            const idx = reports.findIndex((r: any) => r._id === report._id);
            if (idx >= 0) setCurrentIndex(idx);
        }
    }, [report, reports]);

    // Load data for current report
    const loadData = useCallback(async () => {
        if (!currentReport || !isOpen) return;
        try {
            setLoading(true);
            const result = await getReportData(
                workspaceId,
                currentReport.type,
                currentReport.config,
                currentReport.definition
            );
            const adaptedData = adaptReportData(
                result.data,
                currentReport.chartType,
                currentReport.type,
                currentReport.definition
            );
            setData(adaptedData);
        } catch (err) {
            console.error("Error loading fullscreen report:", err);
        } finally {
            setLoading(false);
        }
    }, [currentReport, isOpen, workspaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                setCurrentIndex(i => Math.max(0, i - 1));
            }
            if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                setCurrentIndex(i => Math.min(reports.length - 1, i + 1));
            }
        };
        window.addEventListener("keydown", handleKey);
    }, [isOpen, reports.length, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col"
            >
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        {/* Prev/Next */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                                disabled={currentIndex === 0}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                            >
                                <ChevronUpIcon className="w-4 h-4 text-zinc-500" />
                            </button>
                            <button
                                onClick={() => setCurrentIndex(i => Math.min(reports.length - 1, i + 1))}
                                disabled={currentIndex === reports.length - 1}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                            >
                                <ChevronDownIcon className="w-4 h-4 text-zinc-500" />
                            </button>
                        </div>

                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {currentReport?.title}
                        </h2>
                        <span className="text-xs text-zinc-400">
                            {currentIndex + 1} of {reports.length}
                        </span>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Chart area */}
                <div className="flex-1 p-8 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="h-full max-w-6xl mx-auto flex flex-col">
                            <div className="flex-1 min-h-0" style={{ minHeight: "400px" }}>
                                {renderChart(data, currentReport)}
                            </div>

                            {/* Calculated values table */}
                            <div className="mt-4">
                                <CalculatedValuesTable
                                    data={data}
                                    reportType={currentReport?.type}
                                    title={currentReport?.title}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Fullscreen button icon component for use in ReportWidget header
 */
export function FullscreenButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700/40 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="View fullscreen"
        >
            <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
        </button>
    );
}
