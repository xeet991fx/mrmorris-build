"use client";

/**
 * CalculatedValuesTable - Expandable Data Table with CSV export.
 *
 * Shows the raw data behind a chart in tabular form.
 * Supports CSV download of the data.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowDownTrayIcon,
    TableCellsIcon,
} from "@heroicons/react/24/outline";

interface CalculatedValuesTableProps {
    data: any;
    reportType: string;
    title: string;
}

function extractTableData(data: any, reportType: string): { columns: string[]; rows: any[][] } {
    if (!data) return { columns: [], rows: [] };

    // Handle adapted data with .data array (bar/pie charts)
    if (data.data && Array.isArray(data.data)) {
        const items = data.data;
        if (items.length === 0) return { columns: [], rows: [] };
        const columns = Object.keys(items[0]).filter(k => !k.endsWith("_count"));
        const rows = items.map((item: any) => columns.map(col => item[col]));
        return { columns: columns.map(formatColumnName), rows };
    }

    // Funnel data
    if (data.stages && Array.isArray(data.stages)) {
        const columns = ["Stage", "Count", "Value", "Conversion %"];
        const rows = data.stages.map((s: any) => [
            formatValue(s.stage),
            s.count || 0,
            s.value || 0,
            s.conversionRate !== undefined ? `${s.conversionRate}%` : "—",
        ]);
        return { columns, rows };
    }

    // Historical / time-series data
    if (data.periods && Array.isArray(data.periods)) {
        const items = data.periods;
        if (items.length === 0) return { columns: [], rows: [] };

        const columns = Object.keys(items[0]).filter(k => !k.endsWith("_count"));
        const rows = items.map((item: any) => columns.map(col => item[col]));
        return { columns: columns.map(formatColumnName), rows };
    }

    // Number card
    if (data.value !== undefined && !Array.isArray(data)) {
        const columns = ["Metric", "Value"];
        const rows = [[data.label || "Total", data.value]];
        if (data.count !== undefined) {
            rows[0].push(data.count);
            columns.push("Count");
        }
        return { columns, rows };
    }

    // Performers / table data
    if (data.performers && Array.isArray(data.performers)) {
        const items = data.performers;
        if (items.length === 0) return { columns: [], rows: [] };
        const columns = Object.keys(items[0]);
        const rows = items.map((item: any) => columns.map(col => item[col]));
        return { columns: columns.map(formatColumnName), rows };
    }

    // At-risk deals
    if (data.deals && Array.isArray(data.deals)) {
        const columns = ["Deal", "Value", "Risk Level", "Risk Score"];
        const rows = data.deals.map((d: any) => [
            d.name,
            d.value,
            d.riskLevel,
            d.riskScore,
        ]);
        return { columns, rows };
    }

    return { columns: [], rows: [] };
}

function formatColumnName(name: string): string {
    return name
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, s => s.toUpperCase())
        .trim();
}

function formatValue(val: any): string {
    if (val === null || val === undefined) return "—";
    if (typeof val === "number") {
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString();
    }
    if (typeof val === "string") {
        return val.replace(/_/g, " ").replace(/^./, s => s.toUpperCase());
    }
    return String(val);
}

function downloadCSV(columns: string[], rows: any[][], filename: string) {
    const header = columns.join(",");
    const body = rows
        .map(row =>
            row
                .map(cell => {
                    const val = String(cell ?? "");
                    // Escape values containing commas or quotes
                    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                })
                .join(",")
        )
        .join("\n");

    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export default function CalculatedValuesTable({ data, reportType, title }: CalculatedValuesTableProps) {
    const [expanded, setExpanded] = useState(false);
    const { columns, rows } = useMemo(() => extractTableData(data, reportType), [data, reportType]);

    if (columns.length === 0 || rows.length === 0) return null;

    return (
        <div className="border-t border-zinc-200/50 dark:border-zinc-700/50">
            {/* Toggle header */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(!expanded)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(!expanded);
                    }
                }}
                className="flex items-center justify-between w-full px-3 py-1.5 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/30 transition-colors cursor-pointer select-none"
            >
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    <TableCellsIcon className="w-3 h-3" />
                    Calculated values · {rows.length} rows
                </span>
                <span className="flex items-center gap-1">
                    {expanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadCSV(columns, rows, title);
                            }}
                            className="p-0.5 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-600/40 text-zinc-400 hover:text-emerald-500 transition-colors"
                            title="Export CSV"
                        >
                            <ArrowDownTrayIcon className="w-3 h-3" />
                        </button>
                    )}
                    {expanded ? (
                        <ChevronUpIcon className="w-3 h-3 text-zinc-400" />
                    ) : (
                        <ChevronDownIcon className="w-3 h-3 text-zinc-400" />
                    )}
                </span>
            </div>

            {/* Expandable table */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="max-h-48 overflow-auto px-2 pb-2">
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                        {columns.map((col, i) => (
                                            <th
                                                key={i}
                                                className={`py-1 px-1.5 font-medium text-zinc-500 dark:text-zinc-400 ${i === 0 ? "text-left" : "text-right"
                                                    }`}
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                        >
                                            {row.map((cell, j) => (
                                                <td
                                                    key={j}
                                                    className={`py-1 px-1.5 text-zinc-700 dark:text-zinc-300 ${j === 0 ? "text-left font-medium" : "text-right"
                                                        }`}
                                                >
                                                    {formatValue(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
