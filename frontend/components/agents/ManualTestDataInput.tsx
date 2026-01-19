'use client';

/**
 * ManualTestDataInput - Story 2.2: Select Test Target
 *
 * Allows users to manually input test data values for agent testing
 * when they don't want to select a real contact or deal.
 *
 * AC6: Manual entry fields for common variables
 * Task 5.2: Detect required variables from agent instructions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ManualTestDataInputProps {
  value: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  disabled?: boolean;
  instructions?: string | null;
}

// Common variables that users might want to test with
const ALL_VARIABLES = [
  { key: 'contact.firstName', label: 'First Name', placeholder: 'John' },
  { key: 'contact.lastName', label: 'Last Name', placeholder: 'Doe' },
  { key: 'contact.email', label: 'Email', placeholder: 'john@example.com' },
  { key: 'contact.company', label: 'Company', placeholder: 'Acme Corp' },
  { key: 'contact.title', label: 'Job Title', placeholder: 'CEO' },
  { key: 'contact.phone', label: 'Phone', placeholder: '+1 555 123 4567' },
  { key: 'deal.name', label: 'Deal Name', placeholder: 'Enterprise Deal' },
  { key: 'deal.value', label: 'Deal Value', placeholder: '50000', type: 'number' },
  { key: 'deal.stage', label: 'Deal Stage', placeholder: 'Qualification' },
  { key: 'deal.company', label: 'Deal Company', placeholder: 'Acme Corp' },
  { key: 'deal.contact', label: 'Deal Contact', placeholder: 'John Doe' },
];

export function ManualTestDataInput({
  value,
  onChange,
  disabled = false,
  instructions,
}: ManualTestDataInputProps) {
  // Story 2.2 Task 5.2: Detect required variables from agent instructions
  const detectedVariables = useMemo(() => {
    if (!instructions) return [];

    // Extract @contact.* and @deal.* variable references from instructions
    const variablePattern = /@(contact|deal)\.(\w+)/g;
    const matches = instructions.matchAll(variablePattern);
    const foundKeys = new Set<string>();

    for (const match of matches) {
      const key = `${match[1]}.${match[2]}`;
      foundKeys.add(key);
    }

    return Array.from(foundKeys);
  }, [instructions]);

  // Filter ALL_VARIABLES to show detected ones first, then remaining common ones
  const variablesToShow = useMemo(() => {
    const detected = ALL_VARIABLES.filter(v => detectedVariables.includes(v.key));
    const remaining = ALL_VARIABLES.filter(v => !detectedVariables.includes(v.key));

    // If we detected specific variables, show only those + a few extras
    if (detected.length > 0) {
      // Add up to 2 additional common variables
      return [...detected, ...remaining.slice(0, 2)];
    }

    // No detection - show default set
    return ALL_VARIABLES.slice(0, 7);
  }, [detectedVariables]);

  const handleChange = useCallback((key: string, newValue: string) => {
    onChange({
      ...value,
      [key]: newValue,
    });
  }, [value, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Manual Test Data
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {detectedVariables.length > 0
            ? `Found ${detectedVariables.length} variable(s) in agent instructions. Enter values below.`
            : 'Enter custom values for testing. These will replace @variable references in actions.'}
        </p>
      </div>

      <div className="grid gap-3">
        {variablesToShow.map((variable) => (
          <div key={variable.key} className="space-y-1">
            <Label htmlFor={variable.key} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
              @{variable.key}
              {detectedVariables.includes(variable.key) && (
                <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  used
                </span>
              )}
            </Label>
            <Input
              id={variable.key}
              type={variable.type || 'text'}
              placeholder={variable.placeholder}
              value={value[variable.key] || ''}
              onChange={(e) => handleChange(variable.key, e.target.value)}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
        Leave fields empty to use placeholder text in the preview.
      </p>
    </div>
  );
}

export default ManualTestDataInput;
