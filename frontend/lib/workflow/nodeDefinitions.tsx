"use client";

import React from "react";
import {
    BoltIcon,
    ClockIcon,
    PencilSquareIcon,
    ArrowsRightLeftIcon,
    FunnelIcon,
    ShieldExclamationIcon,
    ArrowPathIcon,
    GlobeAltIcon,
    AdjustmentsHorizontalIcon,
    MapPinIcon,
    PuzzlePieceIcon,
    WrenchScrewdriverIcon,
    SparklesIcon,
    LightBulbIcon,
} from "@heroicons/react/24/outline";
import { GiArtificialIntelligence } from "react-icons/gi";
import { GitBranch, Table, FileText } from "lucide-react";
import { getIntegrationMeta } from "@/lib/workflow/integrations";

// ============================================
// TYPES
// ============================================

export interface NodeDefinition {
    type: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    category: string;
    keywords: string[];
}

export interface CategoryConfig {
    label: string;
    icon: React.ReactNode;
    color: string;
}

// ============================================
// CATEGORY CONFIG
// ============================================

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    triggers: {
        label: "Triggers",
        icon: <MapPinIcon className="w-3.5 h-3.5" />,
        color: "violet",
    },
    actions: {
        label: "Actions",
        icon: <BoltIcon className="w-3.5 h-3.5" />,
        color: "blue",
    },
    integrations: {
        label: "Integrations",
        icon: <PuzzlePieceIcon className="w-3.5 h-3.5" />,
        color: "purple",
    },
    flow: {
        label: "Flow Control",
        icon: <ArrowPathIcon className="w-3.5 h-3.5" />,
        color: "teal",
    },
    data: {
        label: "Data",
        icon: <WrenchScrewdriverIcon className="w-3.5 h-3.5" />,
        color: "emerald",
    },
    ai: {
        label: "AI",
        icon: <SparklesIcon className="w-3.5 h-3.5" />,
        color: "gray",
    },
};

export const CATEGORY_ORDER = ["triggers", "actions", "integrations", "flow", "data", "ai"];

export { LightBulbIcon };

// ============================================
// NODE DEFINITIONS
// ============================================

export const NODE_DEFINITIONS: NodeDefinition[] = [
    // TRIGGERS
    {
        type: "trigger",
        label: "Trigger",
        icon: <BoltIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600",
        description: "What starts the workflow",
        category: "triggers",
        keywords: ["trigger", "start", "begin", "entry"],
    },

    // ACTIONS
    {
        type: "action",
        label: "Action",
        icon: <PencilSquareIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-blue-500 via-cyan-500 to-cyan-600",
        description: "Do something automatically",
        category: "actions",
        keywords: ["action", "do", "execute", "perform"],
    },

    // INTEGRATIONS
    {
        type: "integration_slack",
        label: "Slack",
        icon: (() => {
            const meta = getIntegrationMeta("integration_slack");
            const Icon = meta?.icon;
            return Icon ? <Icon className="w-5 h-5" /> : <span>S</span>;
        })(),
        color: "bg-gradient-to-br from-[#4A154B] to-[#36123A]",
        description: "Team communication & collaboration",
        category: "integrations",
        keywords: ["slack", "message", "chat", "notification", "integration", "team"],
    },
    {
        type: "integration_google_sheets",
        label: "Google Sheets",
        icon: (() => {
            const meta = getIntegrationMeta("integration_google_sheets");
            const Icon = meta?.icon;
            return Icon ? <Icon className="w-5 h-5" /> : <Table className="w-5 h-5" />;
        })(),
        color: "bg-gradient-to-br from-[#0F9D58] to-[#0B8043]",
        description: "Spreadsheet data & automation",
        category: "integrations",
        keywords: ["google", "sheets", "spreadsheet", "data", "integration", "excel"],
    },
    {
        type: "integration_notion",
        label: "Notion",
        icon: (() => {
            const meta = getIntegrationMeta("integration_notion");
            const Icon = meta?.icon;
            return Icon ? <Icon className="w-5 h-5" /> : <FileText className="w-5 h-5" />;
        })(),
        color: "bg-gradient-to-br from-[#000000] to-[#2B2B2B]",
        description: "Notes, docs & knowledge base",
        category: "integrations",
        keywords: ["notion", "notes", "docs", "database", "integration", "wiki"],
    },
    {
        type: "integration_whatsapp",
        label: "WhatsApp",
        icon: (() => {
            const meta = getIntegrationMeta("integration_whatsapp");
            const Icon = meta?.icon;
            return Icon ? <Icon className="w-5 h-5" /> : <span>W</span>;
        })(),
        color: "bg-gradient-to-br from-[#25D366] to-[#1DA851]",
        description: "Messaging & business communication",
        category: "integrations",
        keywords: ["whatsapp", "message", "chat", "sms", "integration"],
    },
    {
        type: "integration_discord",
        label: "Discord",
        icon: (() => {
            const meta = getIntegrationMeta("integration_discord");
            const Icon = meta?.icon;
            return Icon ? <Icon className="w-5 h-5" /> : <span>D</span>;
        })(),
        color: "bg-gradient-to-br from-[#5865F2] to-[#4752C4]",
        description: "Community & team chat",
        category: "integrations",
        keywords: ["discord", "message", "chat", "community", "integration"],
    },

    // FLOW CONTROL
    {
        type: "condition",
        label: "Condition",
        icon: <GitBranch className="w-5 h-5" />,
        color: "bg-gradient-to-br from-teal-500 via-cyan-500 to-cyan-600",
        description: "If/else branching logic",
        category: "flow",
        keywords: ["condition", "if", "else", "branch", "decision"],
    },
    {
        type: "parallel",
        label: "Parallel Split",
        icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-blue-500 to-indigo-600",
        description: "Execute multiple branches",
        category: "flow",
        keywords: ["parallel", "split", "concurrent", "simultaneous"],
    },
    {
        type: "merge",
        label: "Merge",
        icon: <FunnelIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-cyan-500 to-blue-600",
        description: "Join parallel branches",
        category: "flow",
        keywords: ["merge", "join", "combine", "aggregate"],
    },
    {
        type: "try_catch",
        label: "Try/Catch",
        icon: <ShieldExclamationIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-amber-500 to-orange-600",
        description: "Handle errors gracefully",
        category: "flow",
        keywords: ["try", "catch", "error", "exception", "handle"],
    },
    {
        type: "loop",
        label: "Loop",
        icon: <ArrowPathIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-purple-500 to-pink-600",
        description: "Iterate over arrays",
        category: "flow",
        keywords: ["loop", "iterate", "repeat", "foreach", "array"],
    },

    // DATA
    {
        type: "delay",
        label: "Delay",
        icon: <ClockIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-orange-500 via-amber-500 to-amber-600",
        description: "Wait before next step",
        category: "data",
        keywords: ["delay", "wait", "pause", "sleep", "timing"],
    },
    {
        type: "transform",
        label: "Transform",
        icon: <AdjustmentsHorizontalIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-emerald-500 to-teal-600",
        description: "Set/Map/Filter data",
        category: "data",
        keywords: ["transform", "set", "map", "filter", "data", "variable"],
    },
    {
        type: "http_request",
        label: "HTTP Request",
        icon: <GlobeAltIcon className="w-5 h-5" />,
        color: "bg-gradient-to-br from-gray-600 to-gray-700",
        description: "Call external APIs",
        category: "data",
        keywords: ["http", "api", "request", "webhook", "fetch"],
    },

    // AI
    {
        type: "ai_agent",
        label: "AI Agent",
        icon: <GiArtificialIntelligence className="w-5 h-5" />,
        color: "bg-gradient-to-br from-gray-800 to-gray-900",
        description: "AI reasoning with CRM tools",
        category: "ai",
        keywords: ["ai", "agent", "intelligence", "reasoning", "automation"],
    },
];

// ============================================
// HELPERS
// ============================================

export function filterNodes(nodes: NodeDefinition[], query: string): NodeDefinition[] {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.filter(
        (node) =>
            node.label.toLowerCase().includes(q) ||
            node.description.toLowerCase().includes(q) ||
            node.keywords.some((keyword) => keyword.includes(q))
    );
}

export function groupByCategory(nodes: NodeDefinition[]): Record<string, NodeDefinition[]> {
    return {
        triggers: nodes.filter((n) => n.category === "triggers"),
        actions: nodes.filter((n) => n.category === "actions"),
        integrations: nodes.filter((n) => n.category === "integrations"),
        flow: nodes.filter((n) => n.category === "flow"),
        data: nodes.filter((n) => n.category === "data"),
        ai: nodes.filter((n) => n.category === "ai"),
    };
}
