"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, CheckIcon, TrashIcon } from "@heroicons/react/24/outline";
import { BellAlertIcon } from "@heroicons/react/24/solid";
import {
    Notification,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadCount
} from "@/lib/api/notification";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, string> = {
    task_due: "⏰",
    task_assigned: "📋",
    deal_won: "🎉",
    deal_lost: "😔",
    new_lead: "🌟",
    workflow_complete: "✅",
    mention: "💬",
    system: "⚙️",
    custom: "📌",
};

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch unread count on mount and periodically
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const response = await getUnreadCount();
                if (response.success && response.data) {
                    setUnreadCount(response.data.count);
                }
            } catch (error) {
                console.error("Failed to fetch unread count:", error);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            const fetchNotifications = async () => {
                setIsLoading(true);
                try {
                    const response = await getNotifications({ limit: 10 });
                    if (response.success && response.data) {
                        setNotifications(response.data.notifications);
                        setUnreadCount(response.data.unreadCount);
                    }
                } catch (error) {
                    console.error("Failed to fetch notifications:", error);
                }
                setIsLoading(false);
            };
            fetchNotifications();
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkRead = async (id: string) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
                {unreadCount > 0 ? (
                    <BellAlertIcon className="w-5 h-5 text-primary" />
                ) : (
                    <BellIcon className="w-5 h-5 text-muted-foreground" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-red-500 text-white text-xs font-medium rounded-full">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Portal-rendered dropdown to avoid sidebar clipping */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setIsOpen(false)}
                            />

                            {/* Dropdown */}
                            <motion.div
                                ref={dropdownRef}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="fixed w-80 max-h-[400px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[9999]"
                                style={{
                                    left: '70px',
                                    bottom: '80px',
                                }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                    <h3 className="font-semibold text-foreground">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="overflow-y-auto max-h-[320px]">
                                    {isLoading ? (
                                        <div className="p-4 text-center text-muted-foreground">
                                            Loading...
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <BellIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
                                            <p className="text-muted-foreground text-sm">No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification._id}
                                                onClick={() => !notification.isRead && handleMarkRead(notification._id)}
                                                className={cn(
                                                    "px-4 py-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors",
                                                    !notification.isRead && "bg-primary/5"
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-lg flex-shrink-0">
                                                        {TYPE_ICONS[notification.type] || "📌"}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={cn(
                                                                "text-sm truncate",
                                                                !notification.isRead ? "font-medium text-foreground" : "text-muted-foreground"
                                                            )}>
                                                                {notification.title}
                                                            </p>
                                                            {!notification.isRead && (
                                                                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}



