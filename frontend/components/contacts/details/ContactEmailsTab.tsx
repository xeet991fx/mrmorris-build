"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    EnvelopeIcon,
    EnvelopeOpenIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    PaperAirplaneIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Contact } from "@/lib/api/contact";

interface ContactEmailsTabProps {
    workspaceId: string;
    contactId: string;
    contact: Contact;
}

interface Email {
    _id: string;
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    fromEmail: string;
    toEmail: string;
    direction: "inbound" | "outbound";
    sentAt?: string;
    opened?: boolean;
    openedAt?: string;
    clicked?: boolean;
    clickedAt?: string;
    replied?: boolean;
    repliedAt?: string;
    bounced?: boolean;
    bouncedAt?: string;
    replySubject?: string;
    replyBody?: string;
    replySentiment?: string;
    createdAt: string;
}

export default function ContactEmailsTab({
    workspaceId,
    contactId,
    contact,
}: ContactEmailsTabProps) {
    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [showCompose, setShowCompose] = useState(false);
    const [composeData, setComposeData] = useState({
        subject: "",
        body: "",
    });
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetchEmails();
    }, [workspaceId, contactId]);

    const fetchEmails = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(
                `/workspaces/${workspaceId}/contacts/${contactId}/emails`
            );
            if (response.data.success && response.data.data) {
                setEmails(response.data.data.emails || []);
            }
        } catch (error) {
            console.log("Failed to fetch emails:", error);
            setEmails([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!composeData.subject.trim() || !composeData.body.trim()) {
            toast.error("Subject and body are required");
            return;
        }

        if (!contact.email) {
            toast.error("Contact does not have an email address");
            return;
        }

        setIsSending(true);
        try {
            // This would integrate with your email sending system
            toast.success("Email feature coming soon! This will integrate with your email accounts.");
            setShowCompose(false);
            setComposeData({ subject: "", body: "" });
        } catch (error) {
            toast.error("Failed to send email");
        } finally {
            setIsSending(false);
        }
    };

    const getEmailStatusBadge = (email: Email) => {
        if (email.bounced) {
            return (
                <span className="flex items-center gap-1 text-xs text-red-400">
                    <ExclamationCircleIcon className="w-3.5 h-3.5" />
                    Bounced
                </span>
            );
        }
        if (email.replied) {
            return (
                <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Replied
                </span>
            );
        }
        if (email.clicked) {
            return (
                <span className="flex items-center gap-1 text-xs text-blue-400">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Clicked
                </span>
            );
        }
        if (email.opened) {
            return (
                <span className="flex items-center gap-1 text-xs text-cyan-400">
                    <EnvelopeOpenIcon className="w-3.5 h-3.5" />
                    Opened
                </span>
            );
        }
        return (
            <span className="text-xs text-muted-foreground">Delivered</span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">
                        {emails.length} Email{emails.length !== 1 ? "s" : ""}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchEmails}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowCompose(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-background bg-black hover:bg-[#8BC22A] rounded-lg transition-colors"
                    >
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Compose
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {emails.length === 0 && !showCompose ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center p-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <EnvelopeIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-medium text-foreground mb-1">No emails yet</p>
                        <p className="text-sm text-muted-foreground max-w-xs mb-4">
                            Email this contact through campaigns or compose a new email
                        </p>
                        <button
                            onClick={() => setShowCompose(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-background bg-black hover:bg-[#8BC22A] rounded-lg transition-colors"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            Send First Email
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Email List */}
                        <div className="w-1/2 border-r border-border overflow-y-auto">
                            {emails.map((email, index) => (
                                <motion.div
                                    key={email._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => {
                                        setSelectedEmail(email);
                                        setShowCompose(false);
                                    }}
                                    className={cn(
                                        "p-4 border-b border-border cursor-pointer transition-colors",
                                        selectedEmail?._id === email._id && !showCompose
                                            ? "bg-muted"
                                            : "hover:bg-muted/50"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                                email.direction === "outbound"
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "bg-green-500/10 text-green-400"
                                            )}
                                        >
                                            {email.direction === "outbound" ? (
                                                <ArrowUpIcon className="w-4 h-4" />
                                            ) : (
                                                <ArrowDownIcon className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {email.subject || "(No subject)"}
                                                </p>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {email.bodyText?.substring(0, 80) || "No preview available"}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(email.sentAt || email.createdAt), "MMM d, h:mm a")}
                                                </span>
                                                {getEmailStatusBadge(email)}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Email Detail / Compose */}
                        <div className="w-1/2 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {showCompose ? (
                                    <motion.div
                                        key="compose"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="p-4"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-lg font-semibold text-foreground">New Email</h4>
                                            <button
                                                onClick={() => setShowCompose(false)}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                                    To
                                                </label>
                                                <div className="px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground">
                                                    {contact.email || "No email address"}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                                    Subject
                                                </label>
                                                <input
                                                    type="text"
                                                    value={composeData.subject}
                                                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                                                    placeholder="Email subject..."
                                                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                                    Message
                                                </label>
                                                <textarea
                                                    value={composeData.body}
                                                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                                                    placeholder="Write your message..."
                                                    rows={10}
                                                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                                />
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setShowCompose(false)}
                                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSendEmail}
                                                    disabled={isSending || !contact.email}
                                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-background bg-black hover:bg-[#8BC22A] rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <PaperAirplaneIcon className="w-4 h-4" />
                                                    {isSending ? "Sending..." : "Send Email"}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : selectedEmail ? (
                                    <motion.div
                                        key="detail"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="p-4"
                                    >
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold text-foreground">
                                                {selectedEmail.subject || "(No subject)"}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                                <span
                                                    className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium",
                                                        selectedEmail.direction === "outbound"
                                                            ? "bg-blue-500/10 text-blue-400"
                                                            : "bg-green-500/10 text-green-400"
                                                    )}
                                                >
                                                    {selectedEmail.direction === "outbound" ? "Sent" : "Received"}
                                                </span>
                                                <span>
                                                    {format(new Date(selectedEmail.sentAt || selectedEmail.createdAt), "MMM d, yyyy h:mm a")}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm">
                                                <p className="text-muted-foreground">
                                                    From: <span className="text-foreground">{selectedEmail.fromEmail}</span>
                                                </p>
                                                <p className="text-muted-foreground">
                                                    To: <span className="text-foreground">{selectedEmail.toEmail}</span>
                                                </p>
                                            </div>

                                            {/* Tracking Info */}
                                            <div className="flex items-center gap-3 mt-3 py-2 px-3 rounded-lg bg-muted/30 border border-border">
                                                {getEmailStatusBadge(selectedEmail)}
                                                {selectedEmail.openedAt && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Opened: {format(new Date(selectedEmail.openedAt), "MMM d, h:mm a")}
                                                    </span>
                                                )}
                                                {selectedEmail.clickedAt && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Clicked: {format(new Date(selectedEmail.clickedAt), "MMM d, h:mm a")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-border pt-4">
                                            {selectedEmail.bodyHtml ? (
                                                <div
                                                    className="text-sm text-foreground prose prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                                                />
                                            ) : (
                                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                                    {selectedEmail.bodyText || "No content"}
                                                </p>
                                            )}
                                        </div>

                                        {/* Reply Section */}
                                        {selectedEmail.replied && selectedEmail.replyBody && (
                                            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <ArrowDownIcon className="w-4 h-4 text-green-400" />
                                                    <span className="text-sm font-medium text-green-400">Reply Received</span>
                                                    {selectedEmail.replySentiment && (
                                                        <span className="text-xs text-muted-foreground capitalize">
                                                            ({selectedEmail.replySentiment})
                                                        </span>
                                                    )}
                                                </div>
                                                {selectedEmail.replySubject && (
                                                    <p className="text-sm font-medium text-foreground mb-1">
                                                        {selectedEmail.replySubject}
                                                    </p>
                                                )}
                                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                                    {selectedEmail.replyBody}
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center justify-center h-full text-muted-foreground"
                                    >
                                        Select an email to view
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
