import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineItem {
    title: string;
    description?: string;
    timestamp: string;
    icon?: React.ReactNode;
    isActive?: boolean;
}

interface TimelineProps {
    items: TimelineItem[];
    className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
    return (
        <div className={cn('space-y-4', className)}>
            {items.map((item, index) => (
                <div key={index} className="flex gap-4">
                    {/* Timeline line and dot */}
                    <div className="flex flex-col items-center">
                        <div
                            className={cn(
                                'w-3 h-3 rounded-full border-2 flex-shrink-0',
                                item.isActive
                                    ? 'bg-primary border-primary'
                                    : 'bg-background border-border'
                            )}
                        >
                            {item.icon && (
                                <div className="w-full h-full flex items-center justify-center text-xs">
                                    {item.icon}
                                </div>
                            )}
                        </div>
                        {index < items.length - 1 && (
                            <div className="w-0.5 h-full min-h-[2rem] bg-border mt-1" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-medium text-foreground">
                                    {item.title}
                                </h4>
                                {item.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {item.timestamp}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
