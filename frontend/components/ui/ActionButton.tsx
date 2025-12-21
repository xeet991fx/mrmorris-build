"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    EnvelopeIcon,
    PhoneIcon,
    CalendarIcon,
    PlusIcon,
    ArrowPathIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
    type: string;
    label: string;
    onClick: () => void;
    loading?: boolean;
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md";
    expectedImpact?: string;
    className?: string;
}

const actionIcons: Record<string, React.ElementType> = {
    send_email: EnvelopeIcon,
    schedule_call: PhoneIcon,
    schedule_meeting: CalendarIcon,
    create_task: PlusIcon,
    enrich_data: ArrowPathIcon,
    default: ChevronRightIcon,
};

const variantStyles = {
    primary: "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600",
    secondary: "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
};

const sizeStyles = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
};

export const ActionButton: React.FC<ActionButtonProps> = ({
    type,
    label,
    onClick,
    loading = false,
    variant = "secondary",
    size = "sm",
    expectedImpact,
    className,
}) => {
    const Icon = actionIcons[type] || actionIcons.default;

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            disabled={loading}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
        >
            {loading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
                <Icon className="h-4 w-4" />
            )}
            <span>{label}</span>
            {expectedImpact && (
                <span className="ml-1 rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {expectedImpact}
                </span>
            )}
        </motion.button>
    );
};

export default ActionButton;
