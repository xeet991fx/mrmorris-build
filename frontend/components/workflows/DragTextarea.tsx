/**
 * DragTextarea Component
 *
 * Drop-zone wrapper for Textarea fields that:
 * - Accepts drag-drop from DataSourceFloatingCard
 * - Tracks focus state (registers with useDataSourceStore)
 * - Listens for insertPlaceholder events
 * - Shows visual feedback when dragged over
 */

"use client";

import { useEffect, useRef, useId } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Textarea } from '@/components/ui/textarea';
import { useCombinedRefs } from '@/hooks/useCombinedRefs';
import { useDataSourceStore } from '@/store/useDataSourceStore';
import { cn } from '@/lib/utils';

interface DragTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    rows?: number;
    id?: string;
}

export function DragTextarea({
    value,
    onChange,
    placeholder,
    disabled,
    className,
    rows = 4,
    id: providedId,
}: DragTextareaProps) {
    const generatedId = useId();
    const textareaId = providedId || generatedId;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { setActiveInput, clearActiveInput } = useDataSourceStore();

    // Make this textarea droppable
    const { setNodeRef, isOver } = useDroppable({
        id: `drag-textarea-${textareaId}`,
        data: { type: 'textarea' },
    });

    // Combine the drop zone ref with our textarea ref
    const combinedRef = useCombinedRefs<HTMLTextAreaElement>(setNodeRef, textareaRef);

    // Listen for insertPlaceholder events from the store
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

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
                if (textarea) {
                    const newCursorPos = start + placeholder.length;
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                    textarea.focus();
                }
            }, 0);
        };

        textarea.addEventListener('insertPlaceholder', handleInsert);

        return () => {
            textarea.removeEventListener('insertPlaceholder', handleInsert);
        };
    }, [value, onChange]);

    // Track focus state
    const handleFocus = () => {
        if (textareaRef.current) {
            setActiveInput(textareaId, textareaRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>, textareaRef.current);
        }
    };

    const handleBlur = () => {
        // Small delay to allow click-to-insert to work before clearing
        setTimeout(() => {
            clearActiveInput();
        }, 100);
    };

    return (
        <Textarea
            ref={combinedRef}
            id={textareaId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={cn(
                className,
                // Visual feedback when dragging over
                isOver && 'ring-2 ring-blue-500 ring-offset-2'
            )}
        />
    );
}
