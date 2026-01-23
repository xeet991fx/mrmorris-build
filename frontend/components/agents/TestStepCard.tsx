'use client';

/**
 * TestStepCard - Story 2.3: Step-by-Step Execution Preview
 *
 * Individual step display with expand/collapse functionality.
 * Shows step number, action type, status icon, and expandable details.
 */

import React from 'react';
import { TestStepResult, StepIcon, TestStepStatus, StepPreview } from '@/types/agent';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  MagnifyingGlassIcon,
  EnvelopeIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  UserPlusIcon,
  CheckIcon,
  TagIcon,
  PencilIcon,
  BeakerIcon,
  UserGroupIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ForwardIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface TestStepCardProps {
  step: TestStepResult;
  isExpanded: boolean;
  onToggle: () => void;
}

// Map step icon identifiers to Heroicon components
const STEP_ICONS: Record<StepIcon, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  search: MagnifyingGlassIcon,
  email: EnvelopeIcon,
  wait: ClockIcon,
  conditional: ArrowsRightLeftIcon,
  linkedin: UserPlusIcon,
  task: CheckIcon,
  tag: TagIcon,
  update: PencilIcon,
  enrich: BeakerIcon,
  handoff: UserGroupIcon,
  web_search: GlobeAltIcon,
};

// Map status to icon and color
const STATUS_CONFIG: Record<TestStepStatus, {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  success: {
    icon: CheckCircleIcon,
    color: 'text-green-500',
    bgColor: 'bg-white dark:bg-zinc-900',
    borderColor: 'border-zinc-200 dark:border-zinc-700',
    label: 'DRY RUN',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    label: 'WARNING',
  },
  error: {
    icon: XCircleIcon,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'ERROR',
  },
  skipped: {
    icon: ForwardIcon,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
    label: 'SKIPPED',
  },
  not_executed: {
    icon: StopIcon,
    color: 'text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700',
    label: 'NOT EXECUTED',
  },
  simulated: {
    icon: CheckCircleIcon,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'SIMULATED',
  },
};

function StepPreviewRenderer({ preview }: { preview: StepPreview }) {
  switch (preview.type) {
    case 'email':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">To:</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-100">{preview.recipient}</span>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs ml-auto">
              DRY RUN
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Subject:</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-100">{preview.subject}</span>
          </div>
          {preview.templateName && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Template:</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{preview.templateName}</span>
            </div>
          )}
          {preview.bodyPreview && (
            <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {preview.bodyPreview}
            </div>
          )}
        </div>
      );

    case 'search':
      return (
        <div className="space-y-2">
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            Found <span className="font-medium">{preview.matchedCount}</span> contacts matching criteria
          </div>
          {preview.matches.length > 0 && (
            <div className="space-y-1">
              {preview.matches.map((match) => (
                <div key={match.id} className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-900 dark:text-zinc-100">{match.name}</span>
                  {match.subtitle && (
                    <span className="text-zinc-500 dark:text-zinc-400">- {match.subtitle}</span>
                  )}
                  {match.company && (
                    <span className="text-zinc-400 dark:text-zinc-500">@ {match.company}</span>
                  )}
                </div>
              ))}
              {preview.hasMore && (
                <div className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                  ... and {preview.matchedCount - preview.matches.length} more
                </div>
              )}
            </div>
          )}
        </div>
      );

    case 'conditional':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Condition:</span>
            <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {preview.condition}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Result:</span>
            <Badge className={preview.evaluatedTo
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }>
              {preview.evaluatedTo ? 'TRUE' : 'FALSE'}
            </Badge>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {preview.explanation}
          </div>
        </div>
      );

    case 'wait':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {preview.duration} {preview.unit}
            </span>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
              SIMULATED
            </Badge>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {preview.resumeNote}
          </div>
        </div>
      );

    case 'linkedin':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">To:</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-100">{preview.recipient}</span>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs ml-auto">
              DRY RUN
            </Badge>
          </div>
          {preview.messagePreview && (
            <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-sm text-zinc-700 dark:text-zinc-300">
              {preview.messagePreview}
            </div>
          )}
        </div>
      );

    case 'task':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Task:</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-100">{preview.taskTitle}</span>
          </div>
          {preview.assignee && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Assignee:</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{preview.assignee}</span>
            </div>
          )}
          {preview.dueDate && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Due:</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{preview.dueDate}</span>
            </div>
          )}
        </div>
      );

    case 'tag':
      return (
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Would {preview.operation} tag &quot;{preview.tagName}&quot; to {preview.targetCount} contact(s)
          </span>
        </div>
      );

    case 'update':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Field:</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-100">{preview.fieldName}</span>
          </div>
          {preview.oldValue && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">From:</span>
              <span className="text-sm text-zinc-500 line-through">{preview.oldValue}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">To:</span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{preview.newValue}</span>
          </div>
        </div>
      );

    case 'enrich':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Source:</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-100">{preview.source}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Fields:</span>
            {preview.fieldsToEnrich.map((field) => (
              <Badge key={field} variant="outline" className="text-xs">
                {field}
              </Badge>
            ))}
          </div>
        </div>
      );

    case 'web_search':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Would search: &quot;{preview.query}&quot;
            </span>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs ml-auto">
              DRY RUN
            </Badge>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function TestStepCard({ step, isExpanded, onToggle }: TestStepCardProps) {
  const StepIconComponent = STEP_ICONS[step.icon] || PencilIcon;
  const statusConfig = STATUS_CONFIG[step.status];
  const StatusIconComponent = statusConfig.icon;

  const isClickable = step.isExpandable;
  const opacity = step.status === 'not_executed' ? 'opacity-50' : 'opacity-100';

  return (
    <div
      className={`border rounded-lg overflow-hidden ${statusConfig.borderColor} ${statusConfig.bgColor} ${opacity}`}
    >
      {/* Step Header */}
      <button
        onClick={isClickable ? onToggle : undefined}
        className={`w-full flex items-center justify-between p-3 ${isClickable ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'
          } transition-colors`}
        disabled={!isClickable}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-6">
            #{step.stepNumber}
          </span>
          <StatusIconComponent className={`h-5 w-5 ${statusConfig.color}`} />
          <StepIconComponent className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {step.actionLabel}
          </span>
          <Badge
            className={`text-xs ${step.status === 'success'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : step.status === 'error'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : step.status === 'skipped'
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    : step.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
              }`}
          >
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {step.estimatedCredits > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ~{step.estimatedCredits} credits
            </span>
          )}
          {isClickable && (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
            )
          )}
        </div>
      </button>

      {/* Step Content */}
      {isExpanded && isClickable && (
        <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="pt-3">
            {/* Description */}
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
              {step.preview.description}
            </p>

            {/* Rich Preview */}
            {step.richPreview && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-3 mb-3">
                <StepPreviewRenderer preview={step.richPreview} />
              </div>
            )}

            {/* Skip Reason */}
            {step.skipReason && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 italic mb-3">
                {step.skipReason}
              </div>
            )}

            {/* Suggestions (for errors) */}
            {step.suggestions && step.suggestions.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 mb-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
                  Suggestions:
                </p>
                <ul className="list-disc list-inside text-sm text-amber-600 dark:text-amber-400 space-y-1">
                  {step.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Note */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
              {step.note}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestStepCard;
