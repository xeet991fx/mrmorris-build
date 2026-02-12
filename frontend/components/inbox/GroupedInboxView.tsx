"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDownIcon,
    ChevronRightIcon,
    RocketLaunchIcon,
    BoltIcon,
    EnvelopeIcon,
    EnvelopeOpenIcon,
    ChatBubbleLeftRightIcon,
    QueueListIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface Conversation {
    contactId: string;
    contactName: string;
    contactEmail: string;
    messageCount: number;
    unreadCount: number;
    latestMessage: any;
    messages: any[];
}

interface GroupedInboxViewProps {
    groupedData: {
        campaigns: Array<{
            id: string;
            name: string;
            count: number;
            conversations?: Conversation[];
            emails?: any[]; // Backwards compatibility
        }>;
        workflows: Array<{
            id: string;
            name: string;
            count: number;
            conversations?: Conversation[];
            emails?: any[];
        }>;
        sequences: Array<{
            id: string;
            name: string;
            count: number;
            conversations?: Conversation[];
            emails?: any[];
        }>;
        direct: Conversation[] | any[];
    };
    onConversationClick: (conversation: Conversation) => void;
}

export function GroupedInboxView({ groupedData, onConversationClick }: GroupedInboxViewProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['campaigns', 'workflows', 'sequences', 'direct']));
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

    // Conversation Row Component
    const ConversationItem = ({ conversation, index }: { conversation: Conversation; index: number }) => {
        const colors = ['from-blue-500 to-cyan-500', 'from-violet-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-teal-500'];
        const colorClass = colors[index % colors.length];
        const initials = conversation.contactName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const latestMsg = conversation.latestMessage;
        const hasReplied = latestMsg?.replied;

        return (
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onConversationClick(conversation)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group rounded-lg"
            >
                {/* Avatar */}
                <div className="relative">
                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm flex-shrink-0", colorClass)}>
                        {initials || '?'}
                    </div>
                    {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conversation.unreadCount}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                            "font-medium text-sm truncate",
                            conversation.unreadCount > 0
                                ? "text-zinc-900 dark:text-zinc-100"
                                : "text-zinc-700 dark:text-zinc-300"
                        )}>
                            {conversation.contactName}
                        </span>

                        {/* Message count badge */}
                        {conversation.messageCount > 1 && (
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                <ChatBubbleLeftRightIcon className="w-2.5 h-2.5" />
                                {conversation.messageCount}
                            </div>
                        )}

                        {/* Replied badge */}
                        {hasReplied && (
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Replied
                            </div>
                        )}

                        <span className="ml-auto text-xs text-zinc-400">{formatDate(latestMsg?.sentAt || latestMsg?.repliedAt)}</span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                        {latestMsg?.replySubject || latestMsg?.subject || 'No subject'}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                        {latestMsg?.replyBody?.substring(0, 60) || latestMsg?.bodyText?.substring(0, 60) || ''}...
                    </p>
                </div>

                <ChevronRightIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 flex-shrink-0 transition-colors" />
            </motion.button>
        );
    };

    // Helper to get conversations from data (handles both old and new format)
    const getConversations = (item: any): Conversation[] => {
        if (item.conversations) return item.conversations;
        // Backwards compatibility: convert emails to conversations
        if (item.emails) {
            const byContact = new Map<string, any[]>();
            for (const email of item.emails) {
                const key = email.contactId?._id?.toString() || email.toEmail || 'unknown';
                if (!byContact.has(key)) byContact.set(key, []);
                byContact.get(key)!.push(email);
            }
            return Array.from(byContact.entries()).map(([key, emails]) => ({
                contactId: key,
                contactName: emails[0].contactId?.firstName
                    ? `${emails[0].contactId.firstName} ${emails[0].contactId.lastName || ''}`.trim()
                    : emails[0].toEmail || 'Unknown',
                contactEmail: emails[0].contactId?.email || emails[0].toEmail || '',
                messageCount: emails.length,
                unreadCount: emails.filter((e: any) => !e.isRead && e.replied).length,
                latestMessage: emails[0],
                messages: emails,
            }));
        }
        return [];
    };

    const getDirectConversations = (): Conversation[] => {
        const data = groupedData.direct;
        if (Array.isArray(data) && data.length > 0) {
            // Check if it's already in conversation format
            if (data[0].contactId !== undefined && data[0].messages !== undefined) {
                return data as Conversation[];
            }
            // Old format: array of emails
            const byContact = new Map<string, any[]>();
            for (const email of data) {
                const key = email.contactId?._id?.toString() || email.toEmail || 'unknown';
                if (!byContact.has(key)) byContact.set(key, []);
                byContact.get(key)!.push(email);
            }
            return Array.from(byContact.entries()).map(([key, emails]) => ({
                contactId: key,
                contactName: emails[0].contactId?.firstName
                    ? `${emails[0].contactId.firstName} ${emails[0].contactId.lastName || ''}`.trim()
                    : emails[0].toEmail || 'Unknown',
                contactEmail: emails[0].contactId?.email || emails[0].toEmail || '',
                messageCount: emails.length,
                unreadCount: emails.filter((e: any) => !e.isRead && e.replied).length,
                latestMessage: emails[0],
                messages: emails,
            }));
        }
        return [];
    };

    const totalCampaignConversations = groupedData.campaigns.reduce((sum, c) =>
        sum + getConversations(c).length, 0);
    const totalWorkflowConversations = groupedData.workflows.reduce((sum, w) =>
        sum + getConversations(w).length, 0);
    const totalSequenceConversations = (groupedData.sequences || []).reduce((sum, s) =>
        sum + getConversations(s).length, 0);
    const totalDirectConversations = getDirectConversations().length;

    return (
        <div className="space-y-3">
            {/* Campaigns Section */}
            {groupedData.campaigns.length > 0 && (
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                    <button
                        onClick={() => toggleSection('campaigns')}
                        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: expandedSections.has('campaigns') ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRightIcon className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <RocketLaunchIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Campaigns</span>
                        <span className="ml-auto px-2 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                            {totalCampaignConversations} conversations
                        </span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.has('campaigns') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-700/50"
                            >
                                {groupedData.campaigns.map((campaign) => {
                                    const conversations = getConversations(campaign);
                                    return (
                                        <div key={campaign.id} className="border-b border-zinc-100 dark:border-zinc-700/50 last:border-0">
                                            <button
                                                onClick={() => toggleSubdivision(campaign.id)}
                                                className="w-full px-6 py-2.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                                            >
                                                <motion.div
                                                    animate={{ rotate: expandedSubdivisions.has(campaign.id) ? 90 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400" />
                                                </motion.div>
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{campaign.name}</span>
                                                <span className="ml-auto text-xs text-zinc-400">{conversations.length}</span>
                                            </button>

                                            <AnimatePresence>
                                                {expandedSubdivisions.has(campaign.id) && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="bg-zinc-50/50 dark:bg-zinc-900/50 px-2 py-2"
                                                    >
                                                        {conversations.map((conv, idx) => (
                                                            <ConversationItem key={conv.contactId} conversation={conv} index={idx} />
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Workflows Section */}
            {groupedData.workflows.length > 0 && (
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                    <button
                        onClick={() => toggleSection('workflows')}
                        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: expandedSections.has('workflows') ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRightIcon className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                            <BoltIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Workflows</span>
                        <span className="ml-auto px-2 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                            {totalWorkflowConversations} conversations
                        </span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.has('workflows') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-700/50"
                            >
                                {groupedData.workflows.map((workflow) => {
                                    const conversations = getConversations(workflow);
                                    return (
                                        <div key={workflow.id} className="border-b border-zinc-100 dark:border-zinc-700/50 last:border-0">
                                            <button
                                                onClick={() => toggleSubdivision(workflow.id)}
                                                className="w-full px-6 py-2.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                                            >
                                                <motion.div
                                                    animate={{ rotate: expandedSubdivisions.has(workflow.id) ? 90 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400" />
                                                </motion.div>
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{workflow.name}</span>
                                                <span className="ml-auto text-xs text-zinc-400">{conversations.length}</span>
                                            </button>

                                            <AnimatePresence>
                                                {expandedSubdivisions.has(workflow.id) && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="bg-zinc-50/50 dark:bg-zinc-900/50 px-2 py-2"
                                                    >
                                                        {conversations.map((conv, idx) => (
                                                            <ConversationItem key={conv.contactId} conversation={conv} index={idx} />
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Sequences Section */}
            {(groupedData.sequences || []).length > 0 && (
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                    <button
                        onClick={() => toggleSection('sequences')}
                        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: expandedSections.has('sequences') ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRightIcon className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                            <QueueListIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Sequences</span>
                        <span className="ml-auto px-2 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                            {totalSequenceConversations} conversations
                        </span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.has('sequences') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-700/50"
                            >
                                {(groupedData.sequences || []).map((sequence) => {
                                    const conversations = getConversations(sequence);
                                    return (
                                        <div key={sequence.id} className="border-b border-zinc-100 dark:border-zinc-700/50 last:border-0">
                                            <button
                                                onClick={() => toggleSubdivision(sequence.id)}
                                                className="w-full px-6 py-2.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-left"
                                            >
                                                <motion.div
                                                    animate={{ rotate: expandedSubdivisions.has(sequence.id) ? 90 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400" />
                                                </motion.div>
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{sequence.name}</span>
                                                <span className="ml-auto text-xs text-zinc-400">{conversations.length}</span>
                                            </button>

                                            <AnimatePresence>
                                                {expandedSubdivisions.has(sequence.id) && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="bg-zinc-50/50 dark:bg-zinc-900/50 px-2 py-2"
                                                    >
                                                        {conversations.map((conv, idx) => (
                                                            <ConversationItem key={conv.contactId} conversation={conv} index={idx} />
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
            {/* Direct Section */}
            {getDirectConversations().length > 0 && (
                <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                    <button
                        onClick={() => toggleSection('direct')}
                        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: expandedSections.has('direct') ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRightIcon className="w-4 h-4 text-zinc-400" />
                        </motion.div>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-500 to-zinc-600 flex items-center justify-center">
                            <EnvelopeIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Direct</span>
                        <span className="ml-auto px-2 py-0.5 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                            {totalDirectConversations} conversations
                        </span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.has('direct') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-zinc-100 dark:border-zinc-700/50 px-2 py-2"
                            >
                                {getDirectConversations().map((conv, idx) => (
                                    <ConversationItem key={conv.contactId} conversation={conv} index={idx} />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
