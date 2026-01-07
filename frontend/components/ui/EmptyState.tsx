import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    secondaryAction,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
            {icon && (
                <div className="mb-4 text-muted-foreground">
                    {icon}
                </div>
            )}

            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
            </h3>

            {description && (
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    {description}
                </p>
            )}

            {action && (
                <div className="flex items-center gap-3">
                    <button
                        onClick={action.onClick}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        {action.label}
                    </button>

                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
