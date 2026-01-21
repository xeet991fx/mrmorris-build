/**
 * Story 2.5: Test Estimates Storage Utility
 * 
 * Stores and retrieves previous test estimates from localStorage
 * for comparison display (AC7).
 */

import type { StoredEstimate } from '@/types/agent';

const STORAGE_KEY_PREFIX = 'agent_test_estimates_';

/**
 * Save test estimate to localStorage for future comparison.
 */
export function saveTestEstimate(agentId: string, estimate: StoredEstimate): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(
            `${STORAGE_KEY_PREFIX}${agentId}`,
            JSON.stringify(estimate)
        );
    } catch {
        // Ignore storage errors (quota exceeded, etc.)
        console.warn('Failed to save test estimate to localStorage');
    }
}

/**
 * Retrieve previous test estimate from localStorage.
 */
export function getPreviousEstimate(agentId: string): StoredEstimate | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${agentId}`);
        return stored ? JSON.parse(stored) : null;
    } catch {
        // Ignore parse errors
        return null;
    }
}

/**
 * Clear stored estimate for an agent.
 */
export function clearStoredEstimate(agentId: string): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${agentId}`);
    } catch {
        // Ignore errors
    }
}
