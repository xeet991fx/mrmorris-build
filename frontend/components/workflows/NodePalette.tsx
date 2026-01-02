"use client";

import { DragEvent, useState } from "react";
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
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { GiArtificialIntelligence } from "react-icons/gi";
import { GitBranch, Table, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { getIntegrationMeta } from "@/lib/workflow/integrations";

// ============================================
// TYPES
// ============================================

interface NodeDefinition {
    type: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    category: string;
    keywords: string[];
}

// ============================================
// NODE DEFINITIONS
// ============================================

const NODE_DEFINITIONS: NodeDefinition[] = [
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

    // INTEGRATIONS (square icons with app logos)
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
// DRAGGABLE NODE ITEM
// ============================================

interface DraggableNodeProps {
    node: NodeDefinition;
}

function DraggableNode({ node }: DraggableNodeProps) {
    const onDragStart = (event: DragEvent) => {
        event.dataTransfer.setData("application/reactflow-type", node.type);
        event.dataTransfer.effectAllowed = "move";
    };

    const isIntegration = node.category === "integrations";

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className={cn(
                "group relative flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 border-border/50",
                "bg-gradient-to-br from-card to-card/50 backdrop-blur-sm",
                "cursor-grab active:cursor-grabbing",
                "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
                "hover:-translate-y-0.5 transition-all duration-200",
                "active:scale-95"
            )}
        >
            <div
                className={cn(
                    "w-10 h-10 flex items-center justify-center flex-shrink-0 text-white shadow-md",
                    "group-hover:scale-110 transition-transform duration-200",
                    isIntegration ? "rounded-lg" : "rounded-lg",
                    node.color
                )}
            >
                {node.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {node.label}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">{node.description}</p>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}

// ============================================
// CATEGORY SECTION
// ============================================

interface CategorySectionProps {
    title: string;
    color: string;
    nodes: NodeDefinition[];
}

function CategorySection({ title, color, nodes }: CategorySectionProps) {
    if (nodes.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                <div className={cn("h-px flex-1 bg-gradient-to-r from-transparent to-transparent", `via-${color}-500/30`)} />
                <h3 className={cn("text-[9px] font-bold uppercase tracking-widest", `text-${color}-400`)}>
                    {title}
                </h3>
                <div className={cn("h-px flex-1 bg-gradient-to-r from-transparent to-transparent", `via-${color}-500/30`)} />
            </div>
            <div className="space-y-2.5">
                {nodes.map((node) => (
                    <DraggableNode key={node.type} node={node} />
                ))}
            </div>
        </div>
    );
}

// ============================================
// MAIN NODE PALETTE COMPONENT
// ============================================

export default function NodePalette() {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter nodes based on search
    const filteredNodes = searchQuery
        ? NODE_DEFINITIONS.filter((node) => {
              const query = searchQuery.toLowerCase();
              return (
                  node.label.toLowerCase().includes(query) ||
                  node.description.toLowerCase().includes(query) ||
                  node.keywords.some((keyword) => keyword.includes(query))
              );
          })
        : NODE_DEFINITIONS;

    // Group nodes by category
    const nodesByCategory = {
        triggers: filteredNodes.filter((n) => n.category === "triggers"),
        actions: filteredNodes.filter((n) => n.category === "actions"),
        integrations: filteredNodes.filter((n) => n.category === "integrations"),
        flow: filteredNodes.filter((n) => n.category === "flow"),
        data: filteredNodes.filter((n) => n.category === "data"),
        ai: filteredNodes.filter((n) => n.category === "ai"),
    };

    return (
        <div className="w-72 border-r border-border/50 bg-gradient-to-b from-card via-card to-muted/20 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <h2 className="text-xs font-bold text-foreground tracking-tight">Workflow Steps</h2>
                </div>

                {/* Search */}
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs"
                    />
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {searchQuery && filteredNodes.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No nodes found</p>
                        <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                    </div>
                ) : (
                    <>
                        <CategorySection title="📍 Triggers" color="violet" nodes={nodesByCategory.triggers} />
                        <CategorySection title="⚡ Actions" color="blue" nodes={nodesByCategory.actions} />
                        <CategorySection
                            title="🔗 Integrations"
                            color="purple"
                            nodes={nodesByCategory.integrations}
                        />
                        <CategorySection title="🔄 Flow Control" color="teal" nodes={nodesByCategory.flow} />
                        <CategorySection title="🔧 Data" color="emerald" nodes={nodesByCategory.data} />
                        <CategorySection title="🤖 AI" color="gray" nodes={nodesByCategory.ai} />
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-muted/40">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-lg">💡</span>
                    <p className="text-[10px] text-muted-foreground flex-1">
                        Drag nodes to canvas and connect handles
                    </p>
                </div>
            </div>
        </div>
    );
}
