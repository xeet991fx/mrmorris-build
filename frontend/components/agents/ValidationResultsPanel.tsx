/**
 * ValidationResultsPanel.tsx - Story 2.4: Validate Instructions
 *
 * Displays validation results including errors and warnings.
 * AC1: Manual validation trigger display
 * AC2-AC7: Shows validation issues with suggestions
 */

'use client';

import { CheckCircle, XCircle, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationResult, ValidationIssue } from '@/types/agent';

interface ValidationResultsPanelProps {
  validation: ValidationResult | null;
  isLoading: boolean;
  onIssueClick?: (issue: ValidationIssue) => void;
}

export function ValidationResultsPanel({
  validation,
  isLoading,
  onIssueClick
}: ValidationResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Validating instructions...</span>
      </div>
    );
  }

  if (!validation) {
    return null;
  }

  // Success state: valid with no warnings
  if (validation.valid && validation.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm font-medium">Instructions validated successfully. No errors found.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary banner */}
      <div className={cn(
        "p-3 rounded-lg flex items-center gap-2 border",
        validation.errors.length > 0
          ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900"
          : "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900"
      )}>
        {validation.errors.length > 0 ? (
          <>
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {validation.summary.errorCount} error{validation.summary.errorCount !== 1 ? 's' : ''}
              {validation.summary.warningCount > 0 && `, ${validation.summary.warningCount} warning${validation.summary.warningCount !== 1 ? 's' : ''}`}
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {validation.summary.warningCount} warning{validation.summary.warningCount !== 1 ? 's' : ''} found
            </span>
          </>
        )}
      </div>

      {/* Error list */}
      {validation.errors.map((error, i) => (
        <ValidationIssueCard
          key={`error-${i}`}
          issue={error}
          onClick={() => onIssueClick?.(error)}
        />
      ))}

      {/* Warning list */}
      {validation.warnings.map((warning, i) => (
        <ValidationIssueCard
          key={`warning-${i}`}
          issue={warning}
          onClick={() => onIssueClick?.(warning)}
        />
      ))}
    </div>
  );
}

interface ValidationIssueCardProps {
  issue: ValidationIssue;
  onClick?: () => void;
}

function ValidationIssueCard({ issue, onClick }: ValidationIssueCardProps) {
  const isError = issue.severity === 'error';

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
        isError
          ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
          : "border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start gap-2">
        {isError ? (
          <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm",
            isError ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"
          )}>
            {issue.message}
          </p>
          {issue.lineNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Line {issue.lineNumber}
              {issue.instructionText && (
                <span className="ml-1 font-mono">
                  : &quot;{issue.instructionText.length > 50
                    ? `${issue.instructionText.slice(0, 50)}...`
                    : issue.instructionText}&quot;
                </span>
              )}
            </p>
          )}
          {issue.suggestion && (
            <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>{issue.suggestion}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ValidationResultsPanel;
