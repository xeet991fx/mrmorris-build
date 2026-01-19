'use client';

/**
 * TestTargetSelector - Story 2.2: Select Test Target
 *
 * Dropdown with search functionality for selecting a contact or deal to use
 * as the test target during agent testing.
 *
 * AC1: Dropdown appears in TestModePanel
 * AC2: Lists 20 items with "Load more" option
 * AC4: Search field filters results
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { searchTestTargetContacts, searchTestTargetDeals } from '@/lib/api/agents';
import { TestTarget, TestTargetType, TestTargetOption } from '@/types/agent';
import {
  UserIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface TestTargetSelectorProps {
  workspaceId: string;
  value: TestTarget | null;
  onChange: (target: TestTarget | null) => void;
  disabled?: boolean;
  defaultType?: TestTargetType;
}

export function TestTargetSelector({
  workspaceId,
  value,
  onChange,
  disabled = false,
  defaultType = 'contact',
}: TestTargetSelectorProps) {
  // Story 2.2 AC7: Use defaultType for initial state if no value provided
  const [targetType, setTargetType] = useState<TestTargetType>(value?.type || defaultType);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<TestTargetOption[]>([]);
  const [deals, setDeals] = useState<TestTargetOption[]>([]);
  const [hasMoreContacts, setHasMoreContacts] = useState(false);
  const [hasMoreDeals, setHasMoreDeals] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [selectedOption, setSelectedOption] = useState<TestTargetOption | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load contacts
  const loadContacts = useCallback(async (searchTerm?: string, append = false) => {
    setLoadingContacts(true);
    try {
      const result = await searchTestTargetContacts(workspaceId, searchTerm);
      if (append) {
        setContacts(prev => [...prev, ...result.targets]);
      } else {
        setContacts(result.targets);
      }
      setHasMoreContacts(result.hasMore);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  }, [workspaceId]);

  // Load deals
  const loadDeals = useCallback(async (searchTerm?: string, append = false) => {
    setLoadingDeals(true);
    try {
      const result = await searchTestTargetDeals(workspaceId, searchTerm);
      if (append) {
        setDeals(prev => [...prev, ...result.targets]);
      } else {
        setDeals(result.targets);
      }
      setHasMoreDeals(result.hasMore);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoadingDeals(false);
    }
  }, [workspaceId]);

  // Load initial data based on target type
  useEffect(() => {
    if (targetType === 'contact') {
      loadContacts(debouncedSearch);
    } else if (targetType === 'deal') {
      loadDeals(debouncedSearch);
    }
  }, [targetType, debouncedSearch, loadContacts, loadDeals]);

  // Handle target type change
  const handleTypeChange = (type: string) => {
    const newType = type as TestTargetType;
    setTargetType(newType);
    setSelectedOption(null);
    setSearch('');
    if (newType === 'none') {
      onChange({ type: 'none' });
    } else {
      onChange(null);
    }
  };

  // Handle option selection
  const handleSelect = (option: TestTargetOption) => {
    setSelectedOption(option);
    onChange({
      type: targetType,
      id: option.id,
    });
  };

  const currentOptions = targetType === 'contact' ? contacts : deals;
  const hasMore = targetType === 'contact' ? hasMoreContacts : hasMoreDeals;
  const isLoading = targetType === 'contact' ? loadingContacts : loadingDeals;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Test Target
        </label>
        <span className="text-xs text-zinc-500">(optional)</span>
      </div>

      <Tabs value={targetType} onValueChange={handleTypeChange}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="contact" disabled={disabled}>
            <UserIcon className="h-4 w-4 mr-1.5" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="deal" disabled={disabled}>
            <BuildingOfficeIcon className="h-4 w-4 mr-1.5" />
            Deal
          </TabsTrigger>
          <TabsTrigger value="none" disabled={disabled}>
            <DocumentTextIcon className="h-4 w-4 mr-1.5" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contact" className="mt-4 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={disabled}
            />
          </div>
          <TargetList
            options={contacts}
            selected={selectedOption}
            onSelect={handleSelect}
            loading={loadingContacts}
            hasMore={hasMoreContacts}
            onLoadMore={() => loadContacts(debouncedSearch, true)}
            disabled={disabled}
            emptyMessage="No contacts found"
          />
        </TabsContent>

        <TabsContent value="deal" className="mt-4 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={disabled}
            />
          </div>
          <TargetList
            options={deals}
            selected={selectedOption}
            onSelect={handleSelect}
            loading={loadingDeals}
            hasMore={hasMoreDeals}
            onLoadMore={() => loadDeals(debouncedSearch, true)}
            disabled={disabled}
            emptyMessage="No deals found"
          />
        </TabsContent>

        <TabsContent value="none" className="mt-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Use placeholder data for testing. Variables like @contact.email will show as [contact email].
          </p>
        </TabsContent>
      </Tabs>

      {selectedOption && targetType !== 'none' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Selected:</span> {selectedOption.name}
            {selectedOption.company && (
              <span className="text-blue-600 dark:text-blue-400"> at {selectedOption.company}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

interface TargetListProps {
  options: TestTargetOption[];
  selected: TestTargetOption | null;
  onSelect: (option: TestTargetOption) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  disabled: boolean;
  emptyMessage: string;
}

function TargetList({
  options,
  selected,
  onSelect,
  loading,
  hasMore,
  onLoadMore,
  disabled,
  emptyMessage,
}: TargetListProps) {
  if (loading && options.length === 0) {
    return (
      <div className="py-8 text-center text-zinc-500">
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto" />
        <p className="mt-2 text-sm">Loading...</p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="py-6 text-center text-zinc-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 ${
            selected?.id === option.id
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
            {option.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {option.subtitle}
            {option.company && ` · ${option.company}`}
          </p>
        </button>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={disabled || loading}
          className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}

export default TestTargetSelector;
