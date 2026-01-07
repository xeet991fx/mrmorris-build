import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    variant?: 'default' | 'active' | 'success' | 'error' | 'warning';
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md';
}

export function StatusBadge({
    variant = 'default',
    children,
    className,
    size = 'sm'
}: StatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center border rounded font-medium transition-colors',
                {
                    // Sizes
                    'px-2 py-0.5 text-xs': size === 'sm',
                    'px-2.5 py-1 text-sm': size === 'md',

                    // Variants - Outlined, minimal fills
                    'border-border text-muted-foreground': variant === 'default',
                    'border-primary text-primary': variant === 'active',
                    'border-green-500/30 text-green-600 dark:text-green-400': variant === 'success',
                    'border-red-500/30 text-red-600 dark:text-red-400': variant === 'error',
                    'border-yellow-500/30 text-yellow-600 dark:text-yellow-400': variant === 'warning',
                },
                className
            )}
        >
            {children}
        </span>
    );
}
