"use client";

import { useEffect, useCallback } from "react";
import { trackAction } from "@/lib/api/insights";

interface UseInsightTrackingOptions {
    workspaceId: string;
    page: string;
    enabled?: boolean;
}

/**
 * Hook for tracking user actions for AI insights
 *
 * Automatically tracks page views and provides a manual track function
 */
export const useInsightTracking = ({
    workspaceId,
    page,
    enabled = true,
}: UseInsightTrackingOptions) => {
    // Track page view on mount
    useEffect(() => {
        if (!enabled || !workspaceId) return;

        trackAction(workspaceId, 'view', page)
            .catch(err => console.error('Failed to track page view:', err));
    }, [workspaceId, page, enabled]);

    // Manual tracking function
    const track = useCallback(
        async (
            actionType: string,
            resourceType?: string,
            resourceId?: string,
            metadata?: Record<string, any>
        ) => {
            if (!enabled || !workspaceId) return;

            try {
                await trackAction(
                    workspaceId,
                    actionType,
                    page,
                    resourceType,
                    resourceId,
                    metadata
                );
            } catch (error) {
                console.error('Failed to track action:', error);
            }
        },
        [workspaceId, page, enabled]
    );

    return { track };
};

export default useInsightTracking;
