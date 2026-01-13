"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Target, Workflow as WorkflowIcon, Mail, MailOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupedInboxViewProps {
    groupedData: {
        campaigns: Array<{
            id: string;
            name: string;
            count: number;
            emails: any[];
        }>;
        workflows: Array<{
            id: string;
            name: string;
            count: number;
            emails: any[];
        }>;
        direct: any[];
    };
    onEmailClick: (email: any) => void;
}

export function GroupedInboxView({ groupedData, onEmailClick }: GroupedInboxViewProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['campaigns', 'workflows', 'direct']));
    const [expandedSubdivisions, setExpandedSubdivisions] = useState<Set<string>>(new Set());

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const toggleSubdivision = (id: string) => {
        const newExpanded = new Set(expandedSubdivisions);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedSubdivisions(newExpanded);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getContactName = (email: any): string => {
        if (!email.contactId) return email.toEmail || email.fromEmail || "Unknown";
        if (typeof email.contactId === "string") return email.toEmail || email.fromEmail || "Unknown";
        return `${email.contactId.firstName || ''} ${email.contactId.lastName || ''}`.trim() || email.contactId.email || "Unknown";
    };

    const EmailItem = ({ email, index }: { email: any; index: number }) => {
        const colors = ['from-blue-500 to-cyan-500', 'from-violet-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-teal-500'];
        const colorClass = colors[index % colors.length];
        const initials = getContactName(email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        return (
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onEmailClick(email)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group rounded-lg"
            >
                <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-semibold text-xs flex-shrink-0", colorClass)}>
                    {initials || '?'}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">{getContactName(email)}</span>

                        {/* Tracking Indicators */}
                        <div className="flex items-center gap-1">
                            {email.opened && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                    <MailOpen className="w-2.5 h-2.5" />
                                    Opened
                                </div>
                            )}
                            {email.clicked && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 rounded text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                    <Target className="w-2.5 h-2.5" />
                                    Clicked
                                </div>
                            )}
                            {email.replied && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    <Mail className="w-2.5 h-2.5" />
                                    Replied
                                </div>
                            )}
                        </div>

                        <span className="ml-auto text-xs text-zinc-400">{formatDate(email.repliedAt || email.sentAt)}</span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{email.replySubject || email.subject}</p>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 flex-shrink-0 transition-colors" />
            </motion.button>
        );
    };

    const totalCampaigns = groupedData.campaigns.reduce((sum, c) => sum + c.count, 0);
    const totalWorkflows = groupedData.workflows.reduce((sum, w) => sum + w.count, 0);
    const totalDirect = groupedData.direct.length;

    return (
        <div className="space-y-2">
            {/* Campaigns Section */}
            {groupedData.campaigns.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                        onClick={() => toggleSection('campaigns')}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: expandedSections.has('campaigns') ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                        <Target className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Campaigns</span>
                        <span className="ml-auto text-sm text-zinc-500">{totalCampaigns} emails</span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.has('campaigns') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                            >
                                {groupedData.campaigns.map((campaign) => (
                                    <div key={campaign.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                        <button
                                            onClick={() => toggleSubdivision(campaign.id)}
                                            className="w-full px-6 py-2.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                                        >
                                            <motion.div
                                                animate={{ rotate: expandedSubdivisions.has(campaign.id) ? 90 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                            </motion.div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{campaign.name}</span>
                                            <span className="ml-auto text-xs text-zinc-400">{campaign.count}</span>
                                        </button>

                                        <AnimatePresence>
                                            {expandedSubdivisions.has(campaign.id) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-zinc-50/50 dark:bg-zinc-900/50 px-2 py-2"
                                                >
                                                    {campaign.emails.map((email, idx) => (
                                                        <EmailItem key={email._id} email={email} index={idx} />
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Workflows Section */}
            {groupedData.workflows.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                        onClick={() => toggleSection('workflows')}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: expandedSections.has('workflows') ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                        <WorkflowIcon className="w-5 h-5 text-violet-500" />
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Workflows</span>
                        <span className="ml-auto text-sm text-zinc-500">{totalWorkflows} emails</span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.has('workflows') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                            >
                                {groupedData.workflows.map((workflow) => (
                                    <div key={workflow.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                        <button
                                            onClick={() => toggleSubdivision(workflow.id)}
                                            className="w-full px-6 py-2.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                                        >
                                            <motion.div
                                                animate={{ rotate: expandedSubdivisions.has(workflow.id) ? 90 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                            </motion.div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{workflow.name}</span>
                                            <span className="ml-auto text-xs text-zinc-400">{workflow.count}</span>
                                        </button>

                                        <AnimatePresence>
                                            {expandedSubdivisions.has(workflow.id) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-zinc-50/50 dark:bg-zinc-900/50 px-2 py-2"
                                                >
                                                    {workflow.emails.map((email, idx) => (
                                                        <EmailItem key={email._id} email={email} index={idx} />
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Direct Section */}
            {groupedData.direct.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                        onClick={() => toggleSection('direct')}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: expandedSections.has('direct') ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                        <Mail className="w-5 h-5 text-zinc-500" />
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Direct</span>
                        <span className="ml-auto text-sm text-zinc-500">{totalDirect} emails</span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.has('direct') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800 px-2 py-2"
                            >
                                {groupedData.direct.map((email, idx) => (
                                    <EmailItem key={email._id} email={email} index={idx} />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
