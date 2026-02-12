"use client";

import { DragEvent, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    NODE_DEFINITIONS,
    CATEGORY_CONFIG,
    CATEGORY_ORDER,
    LightBulbIcon,
    filterNodes,
    groupByCategory,
    type NodeDefinition,
} from "@/lib/workflow/nodeDefinitions";

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

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className={cn(
                "group relative flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border/50",
                "bg-card",
                "cursor-grab active:cursor-grabbing",
                "hover:border-primary/40 hover:shadow-md",
                "hover:-translate-y-0.5 transition-all duration-200",
                "active:scale-[0.98]"
            )}
        >
            <div
                className={cn(
                    "w-10 h-10 flex items-center justify-center flex-shrink-0 text-white shadow-md",
                    "group-hover:scale-110 transition-transform duration-200",
                    "rounded-lg",
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
        </div>
    );
}

// ============================================
// CATEGORY SECTION
// ============================================

interface CategorySectionProps {
    categoryKey: string;
    nodes: NodeDefinition[];
}

function CategorySection({ categoryKey, nodes }: CategorySectionProps) {
    if (nodes.length === 0) return null;

    const config = CATEGORY_CONFIG[categoryKey];
    if (!config) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                <div className={cn("h-px flex-1 bg-gradient-to-r from-transparent to-transparent", `via-${config.color}-500/30`)} />
                <div className={cn("flex items-center gap-1.5", `text-${config.color}-400`)}>
                    {config.icon}
                    <h3 className="text-[9px] font-bold uppercase tracking-widest">
                        {config.label}
                    </h3>
                </div>
                <div className={cn("h-px flex-1 bg-gradient-to-r from-transparent to-transparent", `via-${config.color}-500/30`)} />
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

    const filteredNodes = filterNodes(NODE_DEFINITIONS, searchQuery);
    const nodesByCategory = groupByCategory(filteredNodes);

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
                        {CATEGORY_ORDER.map((key) => (
                            <CategorySection
                                key={key}
                                categoryKey={key}
                                nodes={nodesByCategory[key] || []}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-muted/40">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                    <LightBulbIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-[10px] text-muted-foreground flex-1">
                        Drag nodes to canvas or double-click canvas to add
                    </p>
                </div>
            </div>
        </div>
    );
}
