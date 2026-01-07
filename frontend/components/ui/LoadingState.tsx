import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
    type?: 'card' | 'table' | 'list';
    count?: number;
    className?: string;
}

export function LoadingState({ type = 'card', count = 3, className }: LoadingStateProps) {
    if (type === 'card') {
        return (
            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="glass-card p-6 space-y-4">
                        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                        <div className="skeleton-shimmer h-3 w-full rounded" />
                        <div className="skeleton-shimmer h-3 w-5/6 rounded" />
                        <div className="flex gap-2 mt-4">
                            <div className="skeleton-shimmer h-8 w-20 rounded" />
                            <div className="skeleton-shimmer h-8 w-20 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'table') {
        return (
            <div className={cn('space-y-3', className)}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                        <div className="skeleton-shimmer h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="skeleton-shimmer h-4 w-1/4 rounded" />
                            <div className="skeleton-shimmer h-3 w-1/3 rounded" />
                        </div>
                        <div className="skeleton-shimmer h-8 w-24 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    // list type
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="skeleton-shimmer h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                        <div className="skeleton-shimmer h-3 w-1/3 rounded" />
                        <div className="skeleton-shimmer h-2 w-1/2 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}
