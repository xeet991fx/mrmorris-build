"use client";

import React, { useEffect } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '@/store/useThemeStore';
import { Button } from './button';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggleTheme } = useThemeStore();

    // Ensure theme is applied on mount
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={cn("rounded-lg transition-colors", className)}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? (
                <SunIcon className="w-5 h-5 text-yellow-500" />
            ) : (
                <MoonIcon className="w-5 h-5 text-blue-600" />
            )}
        </Button>
    );
}
