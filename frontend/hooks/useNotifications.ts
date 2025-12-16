"use client";

import { useState, useEffect, useCallback } from "react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, Notification } from "@/lib/api/notification";

/**
 * Hook for managing notifications with polling
 */
export function useNotifications(pollInterval: number = 30000) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await getNotifications(1, 20, false);
            if (response.success) {
                setNotifications(response.data);
                setUnreadCount(response.unreadCount);
            }
            setError(null);
        } catch (err: any) {
            console.error("Error fetching notifications:", err);
            setError(err.message || "Failed to fetch notifications");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await getUnreadCount();
            if (response.success) {
                setUnreadCount(response.data.count);
            }
        } catch (err) {
            // Silently fail for count updates
        }
    }, []);

    const handleMarkAsRead = useCallback(async (notificationId: string) => {
        try {
            await markAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((n) =>
                    n._id === notificationId ? { ...n, read: true } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Error marking notification as read:", err);
        }
    }, []);

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Poll for updates
    useEffect(() => {
        if (pollInterval <= 0) return;

        const interval = setInterval(fetchUnreadCount, pollInterval);
        return () => clearInterval(interval);
    }, [pollInterval, fetchUnreadCount]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        refetch: fetchNotifications,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
    };
}
