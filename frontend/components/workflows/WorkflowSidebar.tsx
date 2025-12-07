"use client";

import { DragEvent } from "react";
import {
    BoltIcon,
    ClockIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// ============================================
// DRAGGABLE NODE ITEM
// ============================================

interface DraggableNodeProps {
    type: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
}

function DraggableNode({ type, label, icon, color, description }: DraggableNodeProps) {
    const onDragStart = (event: DragEvent) => {
        event.dataTransfer.setData("application/reactflow-type", type);
        event.dataTransfer.effectAllowed = "move";
    };

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
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-md",
                    "group-hover:scale-110 transition-transform duration-200",
                    color
                )}
            >
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {label}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">{description}</p>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}

// ============================================
// MAIN SIDEBAR COMPONENT
// ============================================

export default function WorkflowSidebar() {
    return (
        <div className="w-72 border-r border-border/50 bg-gradient-to-b from-card via-card to-muted/20 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <h2 className="text-sm font-bold text-foreground tracking-tight">Workflow Steps</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                    Drag and drop to build your automation
                </p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Triggers Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                        <h3 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                            Triggers
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                    </div>
                    <DraggableNode
                        type="trigger"
                        label="Trigger"
                        icon={<BoltIcon className="w-5 h-5" />}
                        color="bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600"
                        description="What starts the workflow"
                    />
                </div>

                {/* Actions Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                        <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            Actions
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                    </div>
                    <DraggableNode
                        type="action"
                        label="Action"
                        icon={<PencilSquareIcon className="w-5 h-5" />}
                        color="bg-gradient-to-br from-blue-500 via-cyan-500 to-cyan-600"
                        description="Do something automatically"
                    />
                </div>

                {/* Timing Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                        <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                            Timing
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                    </div>
                    <DraggableNode
                        type="delay"
                        label="Delay"
                        icon={<ClockIcon className="w-5 h-5" />}
                        color="bg-gradient-to-br from-orange-500 via-amber-500 to-amber-600"
                        description="Wait before next step"
                    />
                </div>

                {/* Conditions Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
                        <h3 className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                            Conditions
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
                    </div>
                    <DraggableNode
                        type="condition"
                        label="Condition"
                        icon={<span className="text-xl">🔀</span>}
                        color="bg-gradient-to-br from-teal-500 via-cyan-500 to-cyan-600"
                        description="If/else branching logic"
                    />
                </div>

                {/* Coming Soon Section */}
                <div className="mt-8 space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Coming Soon
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                    <div className="space-y-2.5 opacity-40">
                        <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 border-dashed border-border/50 bg-muted/20">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center">
                                <span className="text-xl">🔀</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground">Conditions</p>
                                <p className="text-xs text-muted-foreground">If/else branching</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 border-dashed border-border/50 bg-muted/20">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center">
                                <span className="text-xl">🎯</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground">Goals</p>
                                <p className="text-xs text-muted-foreground">Exit on achievement</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-muted/40">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-lg">💡</span>
                    <p className="text-xs text-muted-foreground flex-1">
                        Connect nodes by dragging handles
                    </p>
                </div>
            </div>
        </div>
    );
}
