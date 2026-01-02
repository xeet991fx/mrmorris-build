/**
 * DragInput Component
 *
 * Drop-zone wrapper for Input fields that:
 * - Accepts drag-drop from DataSourceFloatingCard
 * - Tracks focus state (registers with useDataSourceStore)
 * - Listens for insertPlaceholder events
 * - Shows visual feedback when dragged over
 */

"use client";

import { useEffect, useRef, useId } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { useCombinedRefs } from '@/hooks/useCombinedRefs';
import { useDataSourceStore } from '@/store/useDataSourceStore';
import { cn } from '@/lib/utils';

interface DragInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    type?: string;
    id?: string;
}

export function DragInput({
    value,
    onChange,
    placeholder,
    disabled,
    className,
    type = 'text',
    id: providedId,
}: DragInputProps) {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const inputRef = useRef<HTMLInputElement>(null);

    const { setActiveInput, clearActiveInput } = useDataSourceStore();

    // Make this input droppable
    const { setNodeRef, isOver } = useDroppable({
        id: `drag-input-${inputId}`,
        data: { type: 'input' },
    });

    // Combine the drop zone ref with our input ref
    const combinedRef = useCombinedRefs<HTMLInputElement>(setNodeRef, inputRef);

    // Listen for insertPlaceholder events from the store
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const handleInsert = (e: Event) => {
            const customEvent = e as CustomEvent<{
                placeholder: string;
                start: number;
                end: number;
            }>;

            const { placeholder, start, end } = customEvent.detail;

            // Build new value with placeholder inserted at cursor position
            const newValue =
                value.substring(0, start) +
                placeholder +
                value.substring(end);

            // Trigger onChange to update parent component
            onChange(newValue);

            // Restore cursor position after placeholder
            setTimeout(() => {
                if (input) {
                    const newCursorPos = start + placeholder.length;
                    input.setSelectionRange(newCursorPos, newCursorPos);
                    input.focus();
                }
            }, 0);
        };

        input.addEventListener('insertPlaceholder', handleInsert);

        return () => {
            input.removeEventListener('insertPlaceholder', handleInsert);
        };
    }, [value, onChange]);

    // Track focus state
    const handleFocus = () => {
        if (inputRef.current) {
            setActiveInput(inputId, inputRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>, inputRef.current);
        }
    };

    const handleBlur = () => {
        // Small delay to allow click-to-insert to work before clearing
        setTimeout(() => {
            clearActiveInput();
        }, 100);
    };

    return (
        <Input
            ref={combinedRef}
            id={inputId}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
                className,
                // Visual feedback when dragging over
                isOver && 'ring-2 ring-blue-500 ring-offset-2'
            )}
        />
    );
}
