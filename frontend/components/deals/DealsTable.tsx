"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    PencilIcon,
    TrashIcon,
    BuildingOfficeIcon,
    UserCircleIcon,
    CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { useDealStore, DealStage } from "@/store/useDealStore";
import type { Deal } from "@/lib/api/deal";
import { cn } from "@/lib/utils";

interface DealsTableProps {
    deals: Deal[];
    onEdit: (deal: Deal) => void;
    onDelete: (dealId: string) => void;
    onStageChange: (dealId: string, stage: DealStage) => void;
    workspaceId: string;
}

const STAGE_CONFIG: Record<DealStage, { label: string; color: string; bg: string }> = {
    lead: { label: "Lead", color: "text-gray-700", bg: "bg-gray-100" },
    qualified: { label: "Qualified", color: "text-blue-700", bg: "bg-blue-100" },
    proposal: { label: "Proposal", color: "text-purple-700", bg: "bg-purple-100" },
    negotiation: { label: "Negotiation", color: "text-orange-700", bg: "bg-orange-100" },
    closed_won: { label: "Won", color: "text-emerald-700", bg: "bg-emerald-100" },
    closed_lost: { label: "Lost", color: "text-red-700", bg: "bg-red-100" },
};

const ICP_FIT_CONFIG = {
    excellent: { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50" },
    good: { label: "Good", color: "text-blue-600", bg: "bg-blue-50" },
    medium: { label: "Medium", color: "text-amber-600", bg: "bg-amber-50" },
    low: { label: "Low", color: "text-gray-600", bg: "bg-gray-50" },
};

const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export default function DealsTable({
    deals,
    onEdit,
    onDelete,
    onStageChange,
    workspaceId,
}: DealsTableProps) {
    const {
        selectedDeals,
        toggleDealSelection,
        selectAllDeals,
        clearSelectedDeals,
        pagination,
        fetchDeals,
    } = useDealStore();

    const [hoveredRow, setHoveredRow] = useState<string | null>(null);

    const allSelected = deals.length > 0 && selectedDeals.length === deals.length;
    const someSelected = selectedDeals.length > 0 && !allSelected;

    const handleSelectAll = () => {
        if (allSelected) {
            clearSelectedDeals();
        } else {
            selectAllDeals();
        }
    };

    const handlePageChange = (newPage: number) => {
        fetchDeals(workspaceId, { page: newPage, limit: pagination.limit });
    };

    const handlePageSizeChange = (newLimit: number) => {
        fetchDeals(workspaceId, { page: 1, limit: newLimit });
    };

    const pageSizeOptions = [20, 50, 100];

    const getCompanyName = (deal: Deal) => {
        if (!deal.companyId) return "-";
        if (typeof deal.companyId === "string") return deal.companyId;
        return deal.companyId.name || "-";
    };

    const getContactCount = (deal: Deal) => {
        if (!deal.contacts) return 0;
        return deal.contacts.length;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Table Container */}
            <div className="flex-1 overflow-auto">
                <table className="w-full table-auto">
                    <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="px-4 py-3 w-9">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(input) => {
                                        if (input) input.indeterminate = someSelected;
                                    }}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 accent-emerald-500 cursor-pointer"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Deal Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Company
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Value
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Stage
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                ICP Fit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Probability
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Contacts
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {deals.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-12 text-center text-sm text-zinc-500"
                                >
                                    No deals found. Create your first deal to get started.
                                </td>
                            </tr>
                        ) : (
                            deals.map((deal, index) => (
                                <motion.tr
                                    key={deal._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onMouseEnter={() => setHoveredRow(deal._id)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    className={cn(
                                        "transition-colors",
                                        selectedDeals.includes(deal._id)
                                            ? "bg-emerald-50 dark:bg-emerald-900/20"
                                            : hoveredRow === deal._id
                                                ? "bg-zinc-50 dark:bg-zinc-800/50"
                                                : ""
                                    )}
                                >
                                    {/* Checkbox */}
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedDeals.includes(deal._id)}
                                            onChange={() => toggleDealSelection(deal._id)}
                                            className="w-4 h-4 rounded border-zinc-300 accent-emerald-500 cursor-pointer"
                                        />
                                    </td>

                                    {/* Deal Name */}
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => onEdit(deal)}
                                            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 transition-colors"
                                        >
                                            {deal.name}
                                        </button>
                                        {deal.source && (
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                Source: {deal.source}
                                            </p>
                                        )}
                                    </td>

                                    {/* Company */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <BuildingOfficeIcon className="w-4 h-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                {getCompanyName(deal)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Value */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                {formatCurrency(deal.value, deal.currency)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Stage */}
                                    <td className="px-4 py-3">
                                        <select
                                            value={deal.stage}
                                            onChange={(e) =>
                                                onStageChange(deal._id, e.target.value as DealStage)
                                            }
                                            className={cn(
                                                "px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer",
                                                STAGE_CONFIG[deal.stage].bg,
                                                STAGE_CONFIG[deal.stage].color
                                            )}
                                        >
                                            {Object.entries(STAGE_CONFIG).map(([value, config]) => (
                                                <option key={value} value={value}>
                                                    {config.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* ICP Fit */}
                                    <td className="px-4 py-3">
                                        {deal.icpFit ? (
                                            <span
                                                className={cn(
                                                    "px-2 py-1 text-xs font-medium rounded-full",
                                                    ICP_FIT_CONFIG[deal.icpFit].bg,
                                                    ICP_FIT_CONFIG[deal.icpFit].color
                                                )}
                                            >
                                                {ICP_FIT_CONFIG[deal.icpFit].label}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-zinc-400">-</span>
                                        )}
                                    </td>

                                    {/* Probability */}
                                    <td className="px-4 py-3">
                                        {deal.probability !== undefined ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full"
                                                        style={{ width: `${deal.probability}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                    {deal.probability}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-400">-</span>
                                        )}
                                    </td>

                                    {/* Contacts */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <UserCircleIcon className="w-4 h-4 text-zinc-400" />
                                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                                {getContactCount(deal)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(deal)}
                                                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 transition-colors"
                                                title="Edit deal"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(deal._id)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-500 hover:text-red-600 transition-colors"
                                                title="Delete deal"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex-shrink-0 py-3 px-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-zinc-500">
                        Showing{" "}
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">
                            {pagination.total === 0
                                ? 0
                                : (pagination.page - 1) * pagination.limit + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">
                            {pagination.total}
                        </span>{" "}
                        deals
                    </p>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">Show:</span>
                        <select
                            value={pagination.limit}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className="px-2 py-1 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            {pageSizeOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {pagination.pages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>

                        <span className="text-sm text-zinc-500">
                            Page {pagination.page} of {pagination.pages}
                        </span>

                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
