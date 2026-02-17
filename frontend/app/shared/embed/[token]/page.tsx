"use client";

import React, { useEffect, useState } from "react";
import { getEmbedDashboard } from "@/lib/api/reportDashboards";
import { getReportData } from "@/lib/api/reportDashboards";
import { adaptReportData } from "@/lib/reportDataAdapters";

/**
 * Embeddable Dashboard Page — rendered inside an <iframe>
 * No header, no sidebar, no auth — read-only widget grid.
 */

interface EmbedWidgetProps {
    report: any;
    workspaceId?: string;
}

function EmbedWidget({ report }: EmbedWidgetProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Embedded widgets show static layout — data fetching requires auth
        // For public embeds, we show the widget structure without live data
        setLoading(false);
    }, []);

    const colSpan = report.position?.w || 2;
    const rowSpan = report.position?.h || 1;

    return (
        <div
            className="bg-white dark:bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50"
            style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                minHeight: rowSpan === 1 ? "120px" : rowSpan === 2 ? "280px" : "400px",
            }}
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                    {report.title}
                </h3>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {report.chartType}
                </span>
            </div>
            <div className="px-3 py-4 flex items-center justify-center h-full">
                {loading ? (
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <div className="text-center">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 flex items-center justify-center">
                            <svg className="w-5 h-5 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{report.title}</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            {report.type} • {report.chartType}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EmbedDashboardPage({ params }: { params: Promise<{ token: string }> }) {
    const [dashboard, setDashboard] = useState<any>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const resolvedParams = await params;
                const result = await getEmbedDashboard(resolvedParams.token);
                setDashboard(result.dashboard);
            } catch (err: any) {
                setError(err.response?.data?.error || "Dashboard not found");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [params]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{error || "Dashboard not found"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4">
            {/* Minimal header */}
            <div className="mb-4 flex items-center gap-2">
                <h1 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {dashboard.name}
                </h1>
                {dashboard.description && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        — {dashboard.description}
                    </span>
                )}
            </div>

            {/* Widget Grid */}
            <div
                className="grid gap-3"
                style={{
                    gridTemplateColumns: "repeat(4, 1fr)",
                }}
            >
                {(dashboard.reports || []).map((report: any, idx: number) => (
                    <EmbedWidget key={report._id || idx} report={report} />
                ))}
            </div>

            {/* Powered By Footer */}
            <div className="mt-6 text-center">
                <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
                    Powered by Clianta
                </span>
            </div>
        </div>
    );
}
