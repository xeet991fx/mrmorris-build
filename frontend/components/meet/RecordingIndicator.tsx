"use client";

import { motion } from "framer-motion";

interface RecordingIndicatorProps {
    isRecording: boolean;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    variant?: "dot" | "badge" | "full";
    className?: string;
}

const sizeConfig = {
    sm: {
        dot: "w-2 h-2",
        text: "text-xs",
        padding: "px-1.5 py-0.5",
        gap: "gap-1",
    },
    md: {
        dot: "w-2.5 h-2.5",
        text: "text-sm",
        padding: "px-2 py-1",
        gap: "gap-1.5",
    },
    lg: {
        dot: "w-3 h-3",
        text: "text-base",
        padding: "px-3 py-1.5",
        gap: "gap-2",
    },
};

export function RecordingIndicator({
    isRecording,
    size = "md",
    showLabel = true,
    variant = "badge",
    className = "",
}: RecordingIndicatorProps) {
    const config = sizeConfig[size];

    if (!isRecording) {
        return null;
    }

    // Simple dot indicator
    if (variant === "dot") {
        return (
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={`${config.dot} rounded-full bg-red-500 ${className}`}
            >
                <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full rounded-full bg-red-500"
                />
            </motion.div>
        );
    }

    // Badge variant - just "REC" with dot
    if (variant === "badge") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`inline-flex items-center ${config.gap} ${config.padding} bg-red-600 text-white rounded-full font-semibold ${className}`}
            >
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    className={`${config.dot} rounded-full bg-white`}
                />
                {showLabel && <span className={config.text}>REC</span>}
            </motion.div>
        );
    }

    // Full variant - with background and more details
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`inline-flex items-center ${config.gap} ${config.padding} bg-red-50 border border-red-200 rounded-lg ${className}`}
        >
            <div className="relative">
                <div className={`${config.dot} rounded-full bg-red-500`} />
                <motion.div
                    animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    className={`absolute inset-0 ${config.dot} rounded-full bg-red-500`}
                />
            </div>
            {showLabel && (
                <span className={`${config.text} font-medium text-red-700`}>
                    Recording in progress
                </span>
            )}
        </motion.div>
    );
}

// Floating recording indicator for meeting overlays
export function FloatingRecordingIndicator({
    isRecording,
    position = "top-right",
}: {
    isRecording: boolean;
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
    const positionClasses = {
        "top-left": "top-4 left-4",
        "top-right": "top-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "bottom-right": "bottom-4 right-4",
    };

    if (!isRecording) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`fixed ${positionClasses[position]} z-50`}
        >
            <div className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-full shadow-lg">
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2.5 h-2.5 rounded-full bg-white"
                />
                <span className="text-sm font-semibold">REC</span>
            </div>
        </motion.div>
    );
}
