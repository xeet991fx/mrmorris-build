"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { themeColors, getStoredTheme, saveTheme, applyTheme, type ThemeColor } from "@/lib/theme";

export function ThemeSelector() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState<ThemeColor>(themeColors[0]);

    useEffect(() => {
        const storedTheme = getStoredTheme();
        setSelectedTheme(storedTheme);
        applyTheme(storedTheme);
    }, []);

    const handleThemeChange = (theme: ThemeColor) => {
        setSelectedTheme(theme);
        saveTheme(theme.id);
        applyTheme(theme);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Theme Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative h-9 w-9 rounded-lg flex items-center justify-center border border-border/60 hover:border-border transition-all duration-200 overflow-hidden group"
                style={{
                    background: selectedTheme.gradient,
                }}
            >
                <Palette className="h-4 w-4 text-white relative z-10" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </motion.button>

            {/* Theme Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40"
                        />

                        {/* Dropdown Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute right-0 mt-2 w-72 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <Palette className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-foreground">Choose Theme Color</h3>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Personalize your experience</p>
                            </div>

                            {/* Color Grid */}
                            <div className="p-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {themeColors.map((theme) => (
                                        <motion.button
                                            key={theme.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleThemeChange(theme)}
                                            className="relative p-4 rounded-xl border-2 transition-all duration-200 group overflow-hidden"
                                            style={{
                                                borderColor: selectedTheme.id === theme.id ? theme.primary : 'transparent',
                                                background: `linear-gradient(135deg, ${theme.primary}10 0%, ${theme.secondary}10 100%)`,
                                            }}
                                        >
                                            {/* Gradient Bar */}
                                            <div
                                                className="h-1 w-full rounded-full mb-3"
                                                style={{ background: theme.gradient }}
                                            />

                                            {/* Theme Info */}
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-base">{theme.icon}</span>
                                                        <p className="text-xs font-semibold text-foreground">{theme.name}</p>
                                                    </div>
                                                </div>

                                                {/* Check Icon */}
                                                <AnimatePresence>
                                                    {selectedTheme.id === theme.id && (
                                                        <motion.div
                                                            initial={{ scale: 0, rotate: -180 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            exit={{ scale: 0, rotate: 180 }}
                                                            transition={{ type: "spring", damping: 15 }}
                                                            className="w-5 h-5 rounded-full flex items-center justify-center"
                                                            style={{ background: theme.primary }}
                                                        >
                                                            <Check className="h-3 w-3 text-white" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Hover Glow */}
                                            <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                                style={{
                                                    background: `radial-gradient(circle at center, ${theme.primary}15 0%, transparent 70%)`,
                                                }}
                                            />
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
