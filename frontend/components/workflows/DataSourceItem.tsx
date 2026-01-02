/**
 * DataSourceItem Component
 *
 * Individual draggable/clickable data source item displayed in the floating card.
 *
 * Features:
 * - Draggable using @dnd-kit
 * - Clickable to insert at cursor position
 * - Displays label, description, type badge, and placeholder syntax
 * - Category-based color coding
 */

"use client";

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    DataSource,
    getSuggestedPlaceholder,
    getCategoryColor,
    getCategoryIcon,
} from '@/hooks/useDataSources';
import { useDataSourceStore } from '@/store/useDataSourceStore';
import { cn } from '@/lib/utils';

interface DataSourceItemProps {
    source: DataSource;
}

export function DataSourceItem({ source }: DataSourceItemProps) {
    const { insertPlaceholder } = useDataSourceStore();

    // Make this item draggable
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `data-source-${source.path}`,
        data: { source }, // Pass source data for drop handler
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    const handleClick = () => {
        insertPlaceholder(source);
    };

    const placeholder = getSuggestedPlaceholder(source);
    const categoryColor = getCategoryColor(source.category);
    const categoryIcon = getCategoryIcon(source.category);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className={cn(
                'px-3 py-2 cursor-pointer rounded-md transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'active:bg-gray-200 dark:active:bg-gray-700',
                'border border-transparent hover:border-gray-300 dark:hover:border-gray-600',
                isDragging && 'cursor-grabbing'
            )}
        >
            {/* Main content */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {/* Label with category icon */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{categoryIcon}</span>
                        <span className="font-medium text-sm truncate">
                            {source.label}
                        </span>
                    </div>

                    {/* Description */}
                    {source.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                            {source.description}
                        </p>
                    )}

                    {/* Placeholder syntax */}
                    <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                        {placeholder}
                    </code>
                </div>

                {/* Type badge */}
                <div className="flex-shrink-0">
                    <span
                        className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            categoryColor
                        )}
                    >
                        {source.type}
                    </span>
                </div>
            </div>

            {/* Step info (if applicable) */}
            {source.stepName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-blue-600 dark:text-blue-400">From step:</span>
                    <span className="font-medium">{source.stepName}</span>
                    {source.stepType && (
                        <span className="text-gray-400">({source.stepType})</span>
                    )}
                </div>
            )}
        </div>
    );
}
