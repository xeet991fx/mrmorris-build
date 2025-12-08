"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CpuChipIcon,
    PlayIcon,
    PauseIcon,
    ArrowPathIcon,
    ChartBarIcon,
    SparklesIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useParams } from "next/navigation";

interface AgentStatus {
    type: string;
    status: "idle" | "running" | "paused" | "error";
    enabled: boolean;
    taskCount: number;
    lastActive?: string;
}

interface AgentConfig {
    type: string;
    enabled: boolean;
    settings: Record<string, any>;
}

export default function AgentDashboard() {
    const params = useParams();
    const projectId = params?.id as string;

    const [agents, setAgents] = useState<AgentStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [insights, setInsights] = useState<any>(null);
    const [chatMessage, setChatMessage] = useState("");
    const [chatResponse, setChatResponse] = useState<string | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Agent icons and descriptions
    const agentInfo: Record<string, { icon: any; description: string; color: string }> = {
        intent: {
            icon: SparklesIcon,
            description: "Natural language understanding",
            color: "text-purple-500"
        },
        planner: {
            icon: ChartBarIcon,
            description: "Goal decomposition",
            color: "text-blue-500"
        },
        workflow_builder: {
            icon: CpuChipIcon,
            description: "Auto-create workflows",
            color: "text-green-500"
        },
        onboarding: {
            icon: PlayIcon,
            description: "Setup wizard",
            color: "text-yellow-500"
        },
        learning: {
            icon: ArrowPathIcon,
            description: "Performance optimization",
            color: "text-pink-500"
        },
        enrichment: {
            icon: SparklesIcon,
            description: "Contact enrichment",
            color: "text-indigo-500"
        },
        email: {
            icon: ClockIcon,
            description: "Email management",
            color: "text-red-500"
        },
        pipeline: {
            icon: ChartBarIcon,
            description: "Deal management",
            color: "text-emerald-500"
        },
        workflow_runner: {
            icon: PlayIcon,
            description: "Workflow execution",
            color: "text-cyan-500"
        },
        integration: {
            icon: Cog6ToothIcon,
            description: "External integrations",
            color: "text-orange-500"
        },
        insights: {
            icon: ChartBarIcon,
            description: "Analytics & reports",
            color: "text-teal-500"
        },
    };

    useEffect(() => {
        fetchAgentStatus();
    }, [projectId]);

    const fetchAgentStatus = async () => {
        try {
            const response = await fetch(`/api/agents/status?workspaceId=${projectId}`);
            if (response.ok) {
                const data = await response.json();
                setAgents(data.agents || []);
            }
        } catch (error) {
            console.error("Failed to fetch agent status:", error);
            // Mock data for development
            setAgents([
                { type: "intent", status: "idle", enabled: true, taskCount: 0 },
                { type: "planner", status: "idle", enabled: true, taskCount: 0 },
                { type: "workflow_builder", status: "idle", enabled: true, taskCount: 0 },
                { type: "onboarding", status: "idle", enabled: true, taskCount: 0 },
                { type: "learning", status: "idle", enabled: true, taskCount: 0 },
                { type: "enrichment", status: "idle", enabled: true, taskCount: 0 },
                { type: "email", status: "idle", enabled: true, taskCount: 0 },
                { type: "pipeline", status: "idle", enabled: true, taskCount: 0 },
                { type: "workflow_runner", status: "idle", enabled: true, taskCount: 0 },
                { type: "integration", status: "idle", enabled: true, taskCount: 0 },
                { type: "insights", status: "idle", enabled: true, taskCount: 0 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const toggleAgent = async (agentType: string, enabled: boolean) => {
        try {
            await fetch(`/api/agents/config/${agentType}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: projectId, enabled }),
            });

            setAgents(prev =>
                prev.map(a => a.type === agentType ? { ...a, enabled } : a)
            );
        } catch (error) {
            console.error("Failed to toggle agent:", error);
        }
    };

    const sendChatMessage = async () => {
        if (!chatMessage.trim()) return;

        setIsChatLoading(true);
        setChatResponse(null);

        try {
            const response = await fetch("/api/agents/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: chatMessage,
                    context: { workspaceId: projectId },
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setChatResponse(data.response || data.data?.response);
            } else {
                setChatResponse("Sorry, I couldn't process that request.");
            }
        } catch (error) {
            setChatResponse("An error occurred. Please try again.");
        } finally {
            setIsChatLoading(false);
            setChatMessage("");
        }
    };

    const fetchDailyInsights = async () => {
        try {
            const response = await fetch(`/api/agents/insights/daily?workspaceId=${projectId}`);
            if (response.ok) {
                const data = await response.json();
                setInsights(data);
            }
        } catch (error) {
            console.error("Failed to fetch insights:", error);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            idle: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
            running: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
            paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
            error: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        };
        return styles[status as keyof typeof styles] || styles.idle;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Agent Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage your AI automation agents
                    </p>
                </div>
                <button
                    onClick={fetchAgentStatus}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Chat with Agents */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <SparklesIcon className="w-6 h-6" />
                    <h2 className="text-lg font-semibold">Talk to Your Agents</h2>
                </div>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                        placeholder="Ask me to automate something..."
                        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <button
                        onClick={sendChatMessage}
                        disabled={isChatLoading}
                        className="px-6 py-3 bg-white text-purple-600 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50"
                    >
                        {isChatLoading ? "Thinking..." : "Send"}
                    </button>
                </div>
                {chatResponse && (
                    <div className="mt-4 p-4 bg-white/10 rounded-xl">
                        <p className="whitespace-pre-wrap">{chatResponse}</p>
                    </div>
                )}
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => {
                    const info = agentInfo[agent.type] || {
                        icon: CpuChipIcon,
                        description: "",
                        color: "text-gray-500"
                    };
                    const Icon = info.icon;

                    return (
                        <div
                            key={agent.type}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${info.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                                            {agent.type.replace(/_/g, " ")}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {info.description}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={agent.enabled}
                                        onChange={(e) => toggleAgent(agent.type, e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(agent.status)}`}>
                                    {agent.status}
                                </span>
                                {agent.taskCount > 0 && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {agent.taskCount} tasks
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={fetchDailyInsights}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                    <ChartBarIcon className="w-5 h-5 text-teal-500" />
                    <span className="font-medium text-gray-900 dark:text-white">Get Daily Insights</span>
                </button>

                <button
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <span className="font-medium text-gray-900 dark:text-white">Get Suggestions</span>
                </button>

                <button
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                    <PlayIcon className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-900 dark:text-white">Start Onboarding</span>
                </button>
            </div>

            {/* Insights Panel */}
            {insights && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        📊 Daily Insights
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">
                            {insights.data?.report || JSON.stringify(insights, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
