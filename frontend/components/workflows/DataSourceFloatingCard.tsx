/**
 * DataSourceFloatingCard Component
 *
 * Positioned next to the focused input field with an arrow connector.
 * Shows available data sources for the current workflow step.
 *
 * Features:
 * - Positioned to the left of the focused input
 * - Arrow pointing to the input field
 * - Click to insert at cursor position
 * - Drag-drop support
 */

"use client";

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DragOverlay, useDndContext } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataSource, getCategoryIcon } from '@/hooks/useDataSources';
import { useDataSourceStore } from '@/store/useDataSourceStore';
import { DataSourceItem } from './DataSourceItem';
import { XMarkIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface DataSourceFloatingCardProps {
    dataSources: DataSource[];
    workspaceId?: string;
    workflowId?: string;
}

const CATEGORY_ORDER = ['entity', 'step', 'variable', 'loop', 'system'] as const;

const CATEGORY_LABELS: Record<string, string> = {
    entity: 'Entity Fields',
    step: 'Step Outputs',
    variable: 'Variables',
    loop: 'Loop Context',
    system: 'System Variables',
};

export function DataSourceFloatingCard({
    dataSources,
}: DataSourceFloatingCardProps) {
    const { isCardVisible, activeInputElement } = useDataSourceStore();
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const dndContext = useDndContext();
    const [draggedSource, setDraggedSource] = useState<DataSource | null>(null);

    // Calculate position based on input element
    useEffect(() => {
        if (activeInputElement && isCardVisible) {
            const rect = activeInputElement.getBoundingClientRect();
            const cardWidth = 320; // w-80 = 320px
            const gap = 16; // 1rem gap

            setPosition({
                top: rect.top + window.scrollY,
                left: rect.left - cardWidth - gap + window.scrollX,
            });
        }
    }, [activeInputElement, isCardVisible]);

    // Group data sources by category
    const groupedSources = useMemo(() => {
        const grouped: Record<string, DataSource[]> = {};

        dataSources.forEach((source) => {
            if (!grouped[source.category]) {
                grouped[source.category] = [];
            }
            grouped[source.category].push(source);
        });

        return grouped;
    }, [dataSources]);

    const toggleCategory = (category: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    if (!isCardVisible || !activeInputElement) return null;

    // Track dragged source from context
    if (dndContext?.active?.data?.current?.source && !draggedSource) {
        setDraggedSource(dndContext.active.data.current.source as DataSource);
    } else if (!dndContext?.active && draggedSource) {
        setDraggedSource(null);
    }

    const cardContent = (
        <>
            <Card
                className={cn(
                    'absolute w-80 shadow-xl border-2 border-blue-500/20',
                    'max-h-96 flex flex-col',
                    'z-50 bg-white dark:bg-gray-900'
                )}
                style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                }}
            >
                {/* Header */}
                <CardHeader className="flex-shrink-0 pb-2 border-b">
                    <CardTitle className="text-sm font-semibold">
                        Available Data Sources
                    </CardTitle>
                </CardHeader>

                {/* Content */}
                <CardContent className="flex-1 overflow-y-auto p-0">
                    {dataSources.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            No data sources available
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-800">
                            {CATEGORY_ORDER.map((category) => {
                                const sources = groupedSources[category];
                                if (!sources || sources.length === 0) return null;

                                const isCollapsed = collapsedCategories.has(category);

                                return (
                                    <div key={category} className="py-2">
                                        {/* Category Header */}
                                        <button
                                            onClick={() => toggleCategory(category)}
                                            className={cn(
                                                'w-full px-3 py-1.5 flex items-center justify-between',
                                                'hover:bg-gray-100 dark:hover:bg-gray-800',
                                                'transition-colors text-left'
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{getCategoryIcon(category)}</span>
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                                                    {CATEGORY_LABELS[category]} ({sources.length})
                                                </span>
                                            </div>
                                            {isCollapsed ? (
                                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                            )}
                                        </button>

                                        {/* Category Items */}
                                        {!isCollapsed && (
                                            <div className="space-y-0.5 px-2 py-1">
                                                {sources.map((source) => (
                                                    <DataSourceItem
                                                        key={source.path}
                                                        source={source}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>

                {/* Footer Hint */}
                <div className="flex-shrink-0 px-4 py-2 border-t bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-xs text-center text-blue-600 dark:text-blue-400 font-medium">
                        Click to insert at cursor
                    </p>
                </div>

                {/* Arrow pointing to input */}
                <div
                    className="absolute right-0 top-4 w-0 h-0"
                    style={{
                        transform: 'translateX(100%)',
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderLeft: '8px solid rgb(96 165 250 / 0.2)', // blue-500/20
                    }}
                />
                <div
                    className="absolute right-0 top-4 w-0 h-0"
                    style={{
                        transform: 'translateX(calc(100% - 2px))',
                        borderTop: '7px solid transparent',
                        borderBottom: '7px solid transparent',
                        borderLeft: '7px solid white',
                    }}
                />
            </Card>

            {/* Drag Overlay */}
            <DragOverlay>
                {draggedSource ? (
                    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-md border-2 border-blue-500 p-3 w-80 opacity-90">
                        <div className="font-medium text-sm">{draggedSource.label}</div>
                        <code className="text-xs font-mono text-blue-600">
                            {`{{${draggedSource.path}}}`}
                        </code>
                    </div>
                ) : null}
            </DragOverlay>
        </>
    );

    // Use portal to render at document.body level
    if (typeof window === 'undefined') return null;

    return createPortal(cardContent, document.body);
}
