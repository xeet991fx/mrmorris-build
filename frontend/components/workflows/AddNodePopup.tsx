"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    NODE_DEFINITIONS,
    CATEGORY_CONFIG,
    CATEGORY_ORDER,
    filterNodes,
    groupByCategory,
    type NodeDefinition,
} from "@/lib/workflow/nodeDefinitions";

// ============================================
// TYPES
// ============================================

interface AddNodePopupProps {
    position: { x: number; y: number };
    canvasPosition: { x: number; y: number };
    onAddNode: (type: string, position: { x: number; y: number }) => void;
    onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function AddNodePopup({ position, canvasPosition, onAddNode, onClose }: AddNodePopupProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fade in on mount
    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    // Focus search input on open
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as globalThis.Node)) {
                onClose();
            }
        };
        // Delay to prevent the opening click from immediately closing
        const timer = setTimeout(() => {
            window.addEventListener("mousedown", handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    const handleSelectNode = useCallback(
        (node: NodeDefinition) => {
            onAddNode(node.type, canvasPosition);
        },
        [onAddNode, canvasPosition]
    );

    const filteredNodes = filterNodes(NODE_DEFINITIONS, searchQuery);
    const nodesByCategory = groupByCategory(filteredNodes);

    // Position the popup so it stays within the viewport
    const popupStyle: React.CSSProperties = {
        position: "fixed",
        left: Math.min(position.x, window.innerWidth - 380),
        top: Math.min(position.y, window.innerHeight - 500),
        zIndex: 100,
    };

    return (
        <div
            ref={popupRef}
            style={popupStyle}
            className={cn(
                "w-[360px] max-h-[480px] flex flex-col",
                "bg-white dark:bg-zinc-900 rounded-xl shadow-2xl",
                "border border-zinc-200 dark:border-zinc-700",
                "transition-all duration-200 origin-top-left",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
        >
            {/* Header / Search */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search nodes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>
            </div>

            {/* Node List */}
            <div className="flex-1 overflow-y-auto p-2">
                {searchQuery && filteredNodes.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-zinc-500">No nodes found</p>
                        <p className="text-xs text-zinc-400 mt-1">Try a different search term</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {CATEGORY_ORDER.map((key) => {
                            const nodes = nodesByCategory[key] || [];
                            if (nodes.length === 0) return null;
                            const config = CATEGORY_CONFIG[key];
                            if (!config) return null;

                            return (
                                <div key={key}>
                                    {/* Category Header */}
                                    <div className={cn("flex items-center gap-1.5 px-2 py-1.5", `text-${config.color}-500 dark:text-${config.color}-400`)}>
                                        {config.icon}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                            {config.label}
                                        </span>
                                    </div>

                                    {/* Node Items */}
                                    <div className="space-y-0.5">
                                        {nodes.map((node) => (
                                            <button
                                                key={node.type}
                                                onClick={() => handleSelectNode(node)}
                                                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group text-left"
                                            >
                                                <div
                                                    className={cn(
                                                        "w-8 h-8 flex items-center justify-center flex-shrink-0 text-white rounded-lg shadow-sm",
                                                        "group-hover:scale-110 transition-transform duration-150",
                                                        node.color
                                                    )}
                                                >
                                                    <span className="[&>svg]:w-4 [&>svg]:h-4">{node.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                                        {node.label}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight truncate">
                                                        {node.description}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
