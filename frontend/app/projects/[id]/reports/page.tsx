"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Plus, BarChart2, PieChart, TrendingUp, FileText, Table, X, Edit, Trash2, Eye, Play } from "lucide-react";
import { getReports, createReport, updateReport, deleteReport, Report, CreateReportInput } from "@/lib/api/report";
import { toast } from "react-hot-toast";

const REPORT_TYPES = [
    { value: "contacts", label: "Contacts", icon: "👤" },
    { value: "companies", label: "Companies", icon: "🏢" },
    { value: "opportunities", label: "Opportunities", icon: "💰" },
    { value: "activities", label: "Activities", icon: "📋" },
    { value: "tasks", label: "Tasks", icon: "✅" },
    { value: "emails", label: "Emails", icon: "📧" },
];

const CHART_TYPES = [
    { value: "table", label: "Table", icon: <Table size={16} /> },
    { value: "bar", label: "Bar Chart", icon: <BarChart2 size={16} /> },
    { value: "line", label: "Line Chart", icon: <TrendingUp size={16} /> },
    { value: "pie", label: "Pie Chart", icon: <PieChart size={16} /> },
];

export default function ReportsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        type: "contacts",
        chartType: "table",
        isPublic: false,
    });

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await getReports(workspaceId);
            if (response.success) {
                setReports(response.data);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (workspaceId) {
            fetchReports();
        }
    }, [workspaceId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error("Please enter a report name");
            return;
        }

        try {
            const data: CreateReportInput = {
                name: formData.name,
                description: formData.description || undefined,
                type: formData.type,
                baseEntity: formData.type.charAt(0).toUpperCase() + formData.type.slice(1, -1),
                chartType: formData.chartType,
                isPublic: formData.isPublic,
            };

            if (selectedReport) {
                await updateReport(workspaceId, selectedReport._id, data);
                toast.success("Report updated");
            } else {
                await createReport(workspaceId, data);
                toast.success("Report created");
            }

            setIsModalOpen(false);
            resetForm();
            fetchReports();
        } catch (error: any) {
            console.error("Error saving report:", error);
            toast.error(error.response?.data?.error || "Failed to save report");
        }
    };

    const handleDelete = async (reportId: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;

        try {
            await deleteReport(workspaceId, reportId);
            toast.success("Report deleted");
            fetchReports();
        } catch (error) {
            console.error("Error deleting report:", error);
            toast.error("Failed to delete report");
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            type: "contacts",
            chartType: "table",
            isPublic: false,
        });
        setSelectedReport(null);
    };

    const openEditModal = (report: Report) => {
        setFormData({
            name: report.name,
            description: report.description || "",
            type: report.type,
            chartType: report.chartType || "table",
            isPublic: report.isPublic,
        });
        setSelectedReport(report);
        setIsModalOpen(true);
    };

    const getChartIcon = (chartType: string) => {
        switch (chartType) {
            case "bar": return <BarChart2 size={20} className="text-blue-500" />;
            case "line": return <TrendingUp size={20} className="text-green-500" />;
            case "pie": return <PieChart size={20} className="text-purple-500" />;
            default: return <Table size={20} className="text-gray-500" />;
        }
    };

    const getTypeInfo = (type: string) => {
        return REPORT_TYPES.find(t => t.value === type) || { label: type, icon: "📊" };
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Create and manage custom reports
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    New Report
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Reports</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{reports.length}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">My Reports</div>
                    <div className="text-2xl font-bold text-blue-600">{reports.filter(r => !r.isPublic).length}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Shared Reports</div>
                    <div className="text-2xl font-bold text-green-600">{reports.filter(r => r.isPublic).length}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Runs</div>
                    <div className="text-2xl font-bold text-purple-600">{reports.reduce((sum, r) => sum + r.runCount, 0)}</div>
                </div>
            </div>

            {/* Reports List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <BarChart2 size={48} className="text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first custom report</p>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                        <Plus size={20} />
                        Create Report
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.map((report) => {
                        const typeInfo = getTypeInfo(report.type);
                        return (
                            <div
                                key={report._id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {getChartIcon(report.chartType || "table")}
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {report.name}
                                            </h3>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {typeInfo.icon} {typeInfo.label}
                                            </span>
                                        </div>
                                    </div>
                                    {report.isPublic && (
                                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                            Shared
                                        </span>
                                    )}
                                </div>

                                {report.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                                        {report.description}
                                    </p>
                                )}

                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                                    <span>Run {report.runCount} times</span>
                                    {report.lastRunAt && (
                                        <span>Last run: {format(parseISO(report.lastRunAt), "MMM d")}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                    >
                                        <Play size={14} />
                                        Run
                                    </button>
                                    <button
                                        onClick={() => openEditModal(report)}
                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <Edit size={14} className="text-gray-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(report._id)}
                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <Trash2 size={14} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Report Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {selectedReport ? "Edit Report" : "Create Report"}
                            </h2>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    resetForm();
                                }}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Report Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Monthly Contact Summary"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Report Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {REPORT_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Visualization Type
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {CHART_TYPES.map((chart) => (
                                        <button
                                            key={chart.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, chartType: chart.value })}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${formData.chartType === chart.value
                                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                                                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                                                }`}
                                        >
                                            {chart.icon}
                                            <span className="text-xs">{chart.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What does this report show?"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={formData.isPublic}
                                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
                                    Share with team members
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                                >
                                    {selectedReport ? "Update Report" : "Create Report"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
