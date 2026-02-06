"use client";

import { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/lib/axios";

interface GoogleConnectionStatus {
    connected: boolean;
    connectedAt?: string;
    loading: boolean;
    error: string | null;
}

export function useGoogleConnection() {
    const [status, setStatus] = useState<GoogleConnectionStatus>({
        connected: false,
        connectedAt: undefined,
        loading: true,
        error: null,
    });

    const checkStatus = useCallback(async () => {
        setStatus((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await axiosInstance.get("/workspaces/google/status");
            if (response.data.success) {
                setStatus({
                    connected: response.data.data.connected,
                    connectedAt: response.data.data.connectedAt,
                    loading: false,
                    error: null,
                });
            }
        } catch (error: any) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error.response?.data?.error || "Failed to check Google status",
            }));
        }
    }, []);

    const connectGoogle = useCallback(async (returnUrl?: string) => {
        try {
            const response = await axiosInstance.get("/workspaces/google/auth-url", {
                params: { returnUrl },
            });
            if (response.data.success) {
                // Redirect to Google OAuth
                window.location.href = response.data.data.authUrl;
            }
        } catch (error: any) {
            setStatus((prev) => ({
                ...prev,
                error: error.response?.data?.error || "Failed to get Google auth URL",
            }));
        }
    }, []);

    const disconnectGoogle = useCallback(async () => {
        try {
            const response = await axiosInstance.post("/workspaces/google/disconnect");
            if (response.data.success) {
                setStatus({
                    connected: false,
                    connectedAt: undefined,
                    loading: false,
                    error: null,
                });
            }
        } catch (error: any) {
            setStatus((prev) => ({
                ...prev,
                error: error.response?.data?.error || "Failed to disconnect Google",
            }));
        }
    }, []);

    // Check status on mount
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    // Check for google_connected query param (after OAuth callback)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("google_connected") === "true") {
            checkStatus();
            // Clean up URL
            params.delete("google_connected");
            const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
            window.history.replaceState({}, "", newUrl);
        }
        if (params.get("google_error")) {
            setStatus((prev) => ({
                ...prev,
                error: params.get("google_error") || "Google connection failed",
            }));
            params.delete("google_error");
            const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
            window.history.replaceState({}, "", newUrl);
        }
    }, [checkStatus]);

    return {
        ...status,
        checkStatus,
        connectGoogle,
        disconnectGoogle,
    };
}
