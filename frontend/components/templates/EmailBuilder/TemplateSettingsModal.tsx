"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { Settings } from "lucide-react";
import { useEmailTemplateStore } from "@/store/useEmailTemplateStore";

interface TemplateSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    { value: "welcome", label: "Welcome" },
    { value: "follow-up", label: "Follow-up" },
    { value: "nurture", label: "Nurture" },
    { value: "promotion", label: "Promotion" },
    { value: "announcement", label: "Announcement" },
    { value: "custom", label: "Custom" },
];

export default function TemplateSettingsModal({ isOpen, onClose }: TemplateSettingsModalProps) {
    const { currentTemplate } = useEmailTemplateStore();
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("custom");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (currentTemplate) {
            setName(currentTemplate.name || "");
            setSubject(currentTemplate.subject || "");
            setCategory(currentTemplate.category || "custom");
            setDescription(currentTemplate.description || "");
        }
    }, [currentTemplate]);

    const handleSave = () => {
        if (currentTemplate) {
            currentTemplate.name = name;
            currentTemplate.subject = subject;
            currentTemplate.category = category;
            currentTemplate.description = description;
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Settings className="w-5 h-5 text-blue-500" />
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Template Settings</h2>
                                <p className="text-xs text-zinc-500">Configure template metadata</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <XMarkIcon className="w-5 h-5 text-zinc-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Template Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Welcome Email"
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Email Subject *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g., Welcome {{firstName}}!"
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-zinc-400 mt-1">Use variables like {"{{firstName}}"}, {"{{company}}"}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="When to use this template"
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name || !subject}
                            className="px-4 py-2 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all disabled:opacity-50"
                        >
                            Save Settings
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
