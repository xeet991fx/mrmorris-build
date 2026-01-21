/**
 * ValidationInlineMarkers.tsx - Story 2.4: Validate Instructions
 *
 * Renders inline error/warning markers in the instructions editor.
 * AC2, AC3, AC4: Highlight issues with tooltips showing details and suggestions.
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationIssue } from '@/types/agent';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ValidationInlineMarkersProps {
  instructions: string;
  issues: ValidationIssue[];
  onIssueClick?: (issue: ValidationIssue) => void;
  className?: string;
}

interface LineMarker {
  lineNumber: number;
  issues: ValidationIssue[];
  hasError: boolean;
}

export function ValidationInlineMarkers({
  instructions,
  issues,
  onIssueClick,
  className
}: ValidationInlineMarkersProps) {
  // Group issues by line number
  const lineMarkers = useMemo(() => {
    const markerMap = new Map<number, LineMarker>();

    for (const issue of issues) {
      const lineNum = issue.lineNumber || 1;

      if (!markerMap.has(lineNum)) {
        markerMap.set(lineNum, {
          lineNumber: lineNum,
          issues: [],
          hasError: false
        });
      }

      const marker = markerMap.get(lineNum)!;
      marker.issues.push(issue);
      if (issue.severity === 'error') {
        marker.hasError = true;
      }
    }

    return Array.from(markerMap.values()).sort((a, b) => a.lineNumber - b.lineNumber);
  }, [issues]);

  // Calculate line positions for absolute positioning
  const lines = useMemo(() => {
    return instructions.split('\n');
  }, [instructions]);

  if (issues.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn("absolute left-0 top-0 w-8 h-full pointer-events-auto", className)}>
        {lineMarkers.map((marker) => (
          <LineMarkerIndicator
            key={marker.lineNumber}
            marker={marker}
            totalLines={lines.length}
            onIssueClick={onIssueClick}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

interface LineMarkerIndicatorProps {
  marker: LineMarker;
  totalLines: number;
  onIssueClick?: (issue: ValidationIssue) => void;
}

function LineMarkerIndicator({ marker, totalLines, onIssueClick }: LineMarkerIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate position based on line number
  // Assuming approximately 20px per line (standard line height for code editors)
  const lineHeight = 20;
  const topPosition = (marker.lineNumber - 1) * lineHeight + 4; // +4 for padding

  const handleClick = useCallback(() => {
    if (marker.issues.length === 1 && onIssueClick) {
      onIssueClick(marker.issues[0]);
    }
  }, [marker.issues, onIssueClick]);

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute left-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors",
            marker.hasError
              ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900"
              : "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:hover:bg-yellow-900"
          )}
          style={{ top: topPosition }}
          onClick={handleClick}
          aria-label={`${marker.issues.length} validation issue${marker.issues.length !== 1 ? 's' : ''} on line ${marker.lineNumber}`}
        >
          {marker.hasError ? (
            <XCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        className="max-w-sm p-0 overflow-hidden"
      >
        <div className="divide-y divide-border">
          {marker.issues.map((issue, idx) => (
            <div
              key={idx}
              className={cn(
                "p-2 cursor-pointer hover:bg-muted/50 transition-colors",
                issue.severity === 'error'
                  ? "bg-red-50/50 dark:bg-red-950/20"
                  : "bg-yellow-50/50 dark:bg-yellow-950/20"
              )}
              onClick={() => {
                onIssueClick?.(issue);
                setIsOpen(false);
              }}
            >
              <div className="flex items-start gap-2">
                {issue.severity === 'error' ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-medium",
                    issue.severity === 'error'
                      ? "text-red-700 dark:text-red-300"
                      : "text-yellow-700 dark:text-yellow-300"
                  )}>
                    {issue.message}
                  </p>
                  {issue.suggestion && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Get line gutter markers for use with code editor components
 * Returns an array of marker objects that can be rendered in a gutter
 */
export function getLineGutterMarkers(issues: ValidationIssue[]): Array<{
  lineNumber: number;
  severity: 'error' | 'warning';
  count: number;
  issues: ValidationIssue[];
}> {
  const markerMap = new Map<number, {
    lineNumber: number;
    severity: 'error' | 'warning';
    count: number;
    issues: ValidationIssue[];
  }>();

  for (const issue of issues) {
    const lineNum = issue.lineNumber || 1;

    if (!markerMap.has(lineNum)) {
      markerMap.set(lineNum, {
        lineNumber: lineNum,
        severity: 'warning',
        count: 0,
        issues: []
      });
    }

    const marker = markerMap.get(lineNum)!;
    marker.issues.push(issue);
    marker.count++;

    // Errors take priority over warnings
    if (issue.severity === 'error') {
      marker.severity = 'error';
    }
  }

  return Array.from(markerMap.values()).sort((a, b) => a.lineNumber - b.lineNumber);
}

export default ValidationInlineMarkers;
