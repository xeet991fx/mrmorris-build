/**
 * SmartInput Component
 *
 * Input/Textarea component with autocomplete for workflow data sources.
 * Shows dropdown when user types `{{` with available data sources (entity fields, step outputs, variables, etc.)
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    DataSource,
    formatDataSourceLabel,
    getSuggestedPlaceholder,
    getCategoryColor,
    getCategoryIcon
} from '@/hooks/useDataSources';

interface SmartInputProps {
    value: string;
    onChange: (value: string) => void;
    dataSources: DataSource[];
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
    disabled?: boolean;
    className?: string;
}

export function SmartInput({
    value,
    onChange,
    dataSources,
    placeholder,
    multiline = false,
    rows = 3,
    disabled = false,
    className = ''
}: SmartInputProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredSources, setFilteredSources] = useState<DataSource[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);

    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Detect `{{` trigger and filter data sources
    useEffect(() => {
        const detectTrigger = () => {
            if (!inputRef.current) return;

            const cursorPos = inputRef.current.selectionStart || 0;
            const textBeforeCursor = value.substring(0, cursorPos);

            // Check if we just typed `{{`
            const lastTwoChars = textBeforeCursor.slice(-2);
            if (lastTwoChars === '{{') {
                setShowDropdown(true);
                setSearchQuery('');
                setFilteredSources(dataSources);
                setSelectedIndex(0);
                setCursorPosition(cursorPos);
                return;
            }

            // Check if we're inside an open placeholder
            const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
            const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

            if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
                // We're inside a placeholder
                const query = textBeforeCursor.substring(lastOpenBrace + 2);
                setSearchQuery(query);
                setCursorPosition(lastOpenBrace + 2);

                // Filter sources based on query
                if (query.trim() === '') {
                    setFilteredSources(dataSources);
                } else {
                    const filtered = dataSources.filter(source => {
                        const searchLower = query.toLowerCase();
                        return (
                            source.label.toLowerCase().includes(searchLower) ||
                            source.path.toLowerCase().includes(searchLower) ||
                            source.description?.toLowerCase().includes(searchLower) ||
                            source.stepName?.toLowerCase().includes(searchLower)
                        );
                    });
                    setFilteredSources(filtered);
                }

                setShowDropdown(true);
                setSelectedIndex(0);
            } else {
                setShowDropdown(false);
            }
        };

        detectTrigger();
    }, [value, dataSources]);

    // Handle selection
    const handleSelectSource = useCallback((source: DataSource) => {
        if (!inputRef.current) return;

        const cursorPos = inputRef.current.selectionStart || 0;
        const textBeforeCursor = value.substring(0, cursorPos);
        const textAfterCursor = value.substring(cursorPos);

        // Find the start of the placeholder
        const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
        if (lastOpenBrace === -1) return;

        // Build the new value
        const beforePlaceholder = value.substring(0, lastOpenBrace);
        const placeholder = getSuggestedPlaceholder(source);
        const newValue = beforePlaceholder + placeholder + textAfterCursor;

        onChange(newValue);
        setShowDropdown(false);

        // Set cursor position after placeholder
        setTimeout(() => {
            if (inputRef.current) {
                const newCursorPos = lastOpenBrace + placeholder.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                inputRef.current.focus();
            }
        }, 0);
    }, [value, onChange]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || filteredSources.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredSources.length - 1));
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;

            case 'Enter':
                if (showDropdown && filteredSources[selectedIndex]) {
                    e.preventDefault();
                    handleSelectSource(filteredSources[selectedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowDropdown(false);
                break;

            case 'Tab':
                if (showDropdown && filteredSources[selectedIndex]) {
                    e.preventDefault();
                    handleSelectSource(filteredSources[selectedIndex]);
                }
                break;
        }
    };

    // Scroll selected item into view
    useEffect(() => {
        if (dropdownRef.current) {
            const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    // Group sources by category for display
    const groupedSources = filteredSources.reduce((acc, source) => {
        if (!acc[source.category]) {
            acc[source.category] = [];
        }
        acc[source.category].push(source);
        return acc;
    }, {} as Record<string, DataSource[]>);

    const categoryOrder: DataSource['category'][] = ['entity', 'step', 'variable', 'loop', 'system'];

    return (
        <div className="relative">
            {multiline ? (
                <Textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={rows}
                    disabled={disabled}
                    className={className}
                />
            ) : (
                <Input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={className}
                />
            )}

            {/* Autocomplete Dropdown */}
            {showDropdown && filteredSources.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto"
                >
                    {/* Category headers and items */}
                    {categoryOrder.map(category => {
                        const items = groupedSources[category];
                        if (!items || items.length === 0) return null;

                        return (
                            <div key={category}>
                                {/* Category header */}
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                    <span>{getCategoryIcon(category)}</span>
                                    <span className="uppercase">{category}</span>
                                </div>

                                {/* Category items */}
                                {items.map((source, idx) => {
                                    const globalIndex = filteredSources.indexOf(source);
                                    const isSelected = globalIndex === selectedIndex;

                                    return (
                                        <div
                                            key={`${source.category}-${source.path}`}
                                            data-index={globalIndex}
                                            className={`px-3 py-2 cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-100 text-blue-900'
                                                    : 'hover:bg-gray-100'
                                            }`}
                                            onClick={() => handleSelectSource(source)}
                                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                        {source.label}
                                                    </div>
                                                    {source.description && (
                                                        <div className="text-xs text-gray-500 truncate">
                                                            {source.description}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-400 font-mono mt-1">
                                                        {getSuggestedPlaceholder(source)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(source.category)}`}>
                                                        {source.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Help text */}
                    <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-200 bg-gray-50">
                        <span className="font-medium">↑↓</span> Navigate{' '}
                        <span className="font-medium ml-2">Enter/Tab</span> Select{' '}
                        <span className="font-medium ml-2">Esc</span> Close
                    </div>
                </div>
            )}

            {/* No results message */}
            {showDropdown && filteredSources.length === 0 && searchQuery && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        No data sources found for &ldquo;{searchQuery}&rdquo;
                    </div>
                </div>
            )}
        </div>
    );
}

export default SmartInput;
