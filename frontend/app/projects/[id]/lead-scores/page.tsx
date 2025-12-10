"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ChartBarIcon,
    ArrowPathIcon,
    UserIcon,
    TrophyIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    getTopLeads,
    getScoreDistribution,
    getAllLeadScores,
    LeadScore,
} from "@/lib/api/leadScore";

// Grade colors for visual representation
const gradeColors: Record<string, { bg: string; text: string; ring: string }> = {
    A: { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/30" },
    B: { bg: "bg-blue-500/10", text: "text-blue-500", ring: "ring-blue-500/30" },
    C: { bg: "bg-amber-500/10", text: "text-amber-500", ring: "ring-amber-500/30" },
    D: { bg: "bg-orange-500/10", text: "text-orange-500", ring: "ring-orange-500/30" },
    F: { bg: "bg-red-500/10", text: "text-red-500", ring: "ring-red-500/30" },
};

interface TopLead extends LeadScore {
    contact: {
        _id: string;
        name: string;
        email: string;
        company?: string;
    };
}

interface Distribution {
    grade: string;
    count: number;
    percentage: number;
}

export default function LeadScoresPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [topLeads, setTopLeads] = useState<TopLead[]>([]);
    const [distribution, setDistribution] = useState<Distribution[]>([]);
    const [allScores, setAllScores] = useState<LeadScore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const [topLeadsRes, distributionRes, allScoresRes] = await Promise.all([
                getTopLeads(workspaceId, 10),
                getScoreDistribution(workspaceId),
                getAllLeadScores(workspaceId, { limit: 50 }),
            ]);

            if (topLeadsRes.success && topLeadsRes.data) {
                setTopLeads(topLeadsRes.data.leads as TopLead[]);
            }

            if (distributionRes.success && distributionRes.data) {
                setDistribution(distributionRes.data.distribution);
            }

            if (allScoresRes.success && allScoresRes.data) {
                setAllScores(allScoresRes.data.leadScores);
            }
        } catch (err: any) {
            console.error("Failed to fetch lead scores:", err);
            setError(err.message || "Failed to load lead scores");
            toast.error("Failed to load lead scores");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalLeads = distribution.reduce((sum, d) => sum + d.count, 0);
    const maxCount = Math.max(...distribution.map((d) => d.count), 1);

    if (isLoading) {
        return (
            <div className="flex-1 p-6">
                <div className="flex items-center justify-center h-64">
                    <ArrowPathIcon className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-6">
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <ExclamationCircleIcon className="w-12 h-12 text-red-500" />
                    <p className="text-muted-foreground">{error}</p>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Lead Scores</h1>
                    <p className="text-muted-foreground">
                        Track and analyze lead engagement and scoring
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Refresh"
                >
                    <ArrowPathIcon className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <UserIcon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground">Total Scored</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <TrophyIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">Grade A Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-500">
                        {distribution.find((d) => d.grade === "A")?.count || 0}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <ArrowTrendingUpIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">High Potential</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">
                        {distribution
                            .filter((d) => d.grade === "A" || d.grade === "B")
                            .reduce((sum, d) => sum + d.count, 0)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <ArrowTrendingDownIcon className="w-5 h-5 text-amber-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">Needs Nurturing</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-500">
                        {distribution
                            .filter((d) => d.grade === "D" || d.grade === "F")
                            .reduce((sum, d) => sum + d.count, 0)}
                    </p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <ChartBarIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">
                            Score Distribution
                        </h2>
                    </div>

                    {distribution.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <ChartBarIcon className="w-12 h-12 mb-2 opacity-50" />
                            <p>No score data available</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {["A", "B", "C", "D", "F"].map((grade) => {
                                const data = distribution.find((d) => d.grade === grade);
                                const count = data?.count || 0;
                                const percentage = data?.percentage || 0;
                                const width = (count / maxCount) * 100;
                                const colors = gradeColors[grade];

                                return (
                                    <motion.div
                                        key={grade}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * ["A", "B", "C", "D", "F"].indexOf(grade) }}
                                        className="flex items-center gap-4"
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}
                                        >
                                            {grade}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-muted-foreground">
                                                    {count} leads
                                                </span>
                                                <span className="text-sm font-medium text-foreground">
                                                    {percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${width}%` }}
                                                    transition={{ duration: 0.5, delay: 0.2 }}
                                                    className={`h-full rounded-full ${colors.bg.replace("/10", "")}`}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Top Leads Table */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <TrophyIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Top Leads</h2>
                    </div>

                    {topLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <UserIcon className="w-12 h-12 mb-2 opacity-50" />
                            <p>No scored leads yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-muted-foreground border-b border-border">
                                        <th className="pb-3 font-medium">Rank</th>
                                        <th className="pb-3 font-medium">Lead</th>
                                        <th className="pb-3 font-medium">Score</th>
                                        <th className="pb-3 font-medium">Grade</th>
                                        <th className="pb-3 font-medium">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {topLeads.map((lead, index) => {
                                        const colors = gradeColors[lead.grade] || gradeColors.C;
                                        const scoreDiff = lead.currentScore - lead.previousScore;

                                        return (
                                            <motion.tr
                                                key={lead._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-muted/30 transition-colors"
                                            >
                                                <td className="py-3">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {lead.contact?.name || "Unknown"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {lead.contact?.email || "-"}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <span className="font-mono font-bold text-foreground">
                                                        {lead.currentScore}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-md text-sm font-medium ${colors.bg} ${colors.text}`}
                                                    >
                                                        {lead.grade}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    {scoreDiff !== 0 && (
                                                        <span
                                                            className={`flex items-center gap-1 text-sm ${scoreDiff > 0
                                                                    ? "text-emerald-500"
                                                                    : "text-red-500"
                                                                }`}
                                                        >
                                                            {scoreDiff > 0 ? (
                                                                <ArrowTrendingUpIcon className="w-4 h-4" />
                                                            ) : (
                                                                <ArrowTrendingDownIcon className="w-4 h-4" />
                                                            )}
                                                            {scoreDiff > 0 ? "+" : ""}
                                                            {scoreDiff}
                                                        </span>
                                                    )}
                                                    {scoreDiff === 0 && (
                                                        <span className="text-sm text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Filter by Grade */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 bg-card border border-border rounded-xl p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">All Scored Leads</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedGrade(null)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${selectedGrade === null
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                        >
                            All
                        </button>
                        {["A", "B", "C", "D", "F"].map((grade) => (
                            <button
                                key={grade}
                                onClick={() => setSelectedGrade(grade)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${selectedGrade === grade
                                        ? `${gradeColors[grade].bg} ${gradeColors[grade].text}`
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                            >
                                {grade}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-muted-foreground border-b border-border">
                                <th className="pb-3 font-medium">Contact ID</th>
                                <th className="pb-3 font-medium">Current Score</th>
                                <th className="pb-3 font-medium">Previous Score</th>
                                <th className="pb-3 font-medium">Grade</th>
                                <th className="pb-3 font-medium">Last Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {allScores
                                .filter((s) => !selectedGrade || s.grade === selectedGrade)
                                .map((score, index) => {
                                    const colors = gradeColors[score.grade] || gradeColors.C;
                                    return (
                                        <tr
                                            key={score._id}
                                            className="hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="py-3 font-mono text-sm text-foreground">
                                                {score.contactId.slice(-8)}
                                            </td>
                                            <td className="py-3 font-bold text-foreground">
                                                {score.currentScore}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {score.previousScore}
                                            </td>
                                            <td className="py-3">
                                                <span
                                                    className={`px-2 py-1 rounded-md text-sm font-medium ${colors.bg} ${colors.text}`}
                                                >
                                                    {score.grade}
                                                </span>
                                            </td>
                                            <td className="py-3 text-sm text-muted-foreground">
                                                {score.lastActivityAt
                                                    ? new Date(score.lastActivityAt).toLocaleDateString()
                                                    : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            {allScores.filter((s) => !selectedGrade || s.grade === selectedGrade)
                                .length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            No leads found
                                            {selectedGrade ? ` with grade ${selectedGrade}` : ""}
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
