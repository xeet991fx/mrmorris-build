/**
 * Zustand Store for Data Source Drag-Drop System
 *
 * Manages:
 * - Active input field tracking (which field receives insertions)
 * - Floating card visibility state
 * - Placeholder insertion logic
 */

import { create } from 'zustand';
import { RefObject } from 'react';
import { DataSource, getSuggestedPlaceholder } from '@/hooks/useDataSources';

interface DataSourceStoreState {
    // Active field tracking
    activeInputId: string | null;
    activeInputRef: RefObject<HTMLInputElement | HTMLTextAreaElement> | null;
    activeInputElement: HTMLInputElement | HTMLTextAreaElement | null;

    // Card visibility
    isCardVisible: boolean;

    // Actions
    setActiveInput: (id: string, ref: RefObject<HTMLInputElement | HTMLTextAreaElement>, element: HTMLInputElement | HTMLTextAreaElement) => void;
    clearActiveInput: () => void;
    showCard: () => void;
    hideCard: () => void;
    toggleCard: () => void;
    insertPlaceholder: (source: DataSource) => void;
}

export const useDataSourceStore = create<DataSourceStoreState>((set, get) => ({
    // Initial state
    activeInputId: null,
    activeInputRef: null,
    activeInputElement: null,
    isCardVisible: false, // Hidden by default, shows when input focused

    // Set the currently focused input field
    setActiveInput: (id, ref, element) => {
        set({
            activeInputId: id,
            activeInputRef: ref,
            activeInputElement: element,
            isCardVisible: true,
        });
    },

    // Clear active input when field loses focus
    clearActiveInput: () => {
        set({
            activeInputId: null,
            activeInputRef: null,
            activeInputElement: null,
            isCardVisible: false,
        });
    },

    // Show the floating card
    showCard: () => {
        set({ isCardVisible: true });
    },

    // Hide the floating card
    hideCard: () => {
        set({ isCardVisible: false });
    },

    // Toggle card visibility
    toggleCard: () => {
        set((state) => ({ isCardVisible: !state.isCardVisible }));
    },

    // Insert placeholder into active input at cursor position
    insertPlaceholder: (source: DataSource) => {
        const { activeInputRef } = get();

        if (!activeInputRef?.current) {
            console.warn('No active input field to insert into');
            return;
        }

        const input = activeInputRef.current;
        const placeholder = getSuggestedPlaceholder(source); // "{{path}}"

        // Get current cursor position
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;

        // Dispatch custom event with insertion details
        // The DragInput/DragTextarea components will listen for this event
        const event = new CustomEvent('insertPlaceholder', {
            detail: {
                placeholder,
                start,
                end,
                source,
            },
        });

        input.dispatchEvent(event);

        // Focus the input after insertion
        setTimeout(() => {
            input.focus();
        }, 0);
    },
}));
