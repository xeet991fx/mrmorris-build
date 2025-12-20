import { useState, useRef, useEffect, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface SelectOption {
    value: string;
    label: string;
    sublabel?: string;
}

interface SearchableMultiSelectProps {
    options: SelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    error?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
}

export default function SearchableMultiSelect({
    options,
    value,
    onChange,
    placeholder = "Search and select...",
    error = false,
    isLoading = false,
    disabled = false,
}: SearchableMultiSelectProps) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on search query
    const filteredOptions =
        query === ""
            ? options
            : options.filter((option) =>
                option.label.toLowerCase().includes(query.toLowerCase()) ||
                option.sublabel?.toLowerCase().includes(query.toLowerCase())
            );

    // Get selected options for display
    const selectedOptions = options.filter((opt) => value.includes(opt.value));

    // Toggle selection
    const toggleOption = useCallback((optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter((v) => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    }, [value, onChange]);

    // Remove a selected item
    const removeOption = (optionValue: string) => {
        onChange(value.filter((v) => v !== optionValue));
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setQuery("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            {/* Input area with selected chips */}
            <div
                className={cn(
                    "min-h-[42px] px-3 py-2 bg-input border rounded-lg flex flex-wrap items-center gap-1.5 cursor-text transition-all duration-100",
                    error
                        ? "border-red-500/50 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
                        : "border-border focus-within:border-[#9ACD32] focus-within:ring-2 focus-within:ring-[#9ACD32]/20",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(true);
                        inputRef.current?.focus();
                    }
                }}
            >
                {/* Selected chips */}
                {selectedOptions.map((option) => (
                    <span
                        key={option.value}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#9ACD32]/20 text-foreground text-xs rounded-md"
                    >
                        {option.label}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeOption(option.value);
                            }}
                            className="hover:text-red-500 transition-colors"
                            disabled={disabled}
                        >
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                {/* Search input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={selectedOptions.length === 0 ? placeholder : ""}
                    className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                    disabled={disabled}
                />

                {/* Dropdown arrow */}
                <ChevronUpDownIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto rounded-lg bg-popover border border-border shadow-xl py-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-input">
                    {isLoading ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                            {query ? "No results found" : "No options available"}
                        </div>
                    ) : (
                        filteredOptions.map((option) => {
                            const isSelected = value.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    onClick={() => toggleOption(option.value)}
                                    className={cn(
                                        "relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors hover:bg-[#9ACD32]/10",
                                        isSelected && "bg-[#9ACD32]/5"
                                    )}
                                >
                                    <div className="flex flex-col">
                                        <span className={cn("block truncate text-sm", isSelected && "font-semibold")}>
                                            {option.label}
                                        </span>
                                        {option.sublabel && (
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {option.sublabel}
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#9ACD32]">
                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
