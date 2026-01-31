'use client';

import React, { useState } from 'react';
import { AlertTriangle, Mail, Plug, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * ValidationWarningsList Component
 * Story 4.2, Task 4.3
 *
 * Display validation warnings with actionable links
 */

interface ValidationWarning {
  type: 'missing_template' | 'missing_field' | 'missing_integration' | 'invalid_syntax';
  message: string;
  line: number;
}

interface ValidationWarningsListProps {
  warnings: ValidationWarning[];
  onCreateTemplate?: () => void;
  onConnectIntegration?: () => void;
  onFixManually?: () => void;
}

export default function ValidationWarningsList({
  warnings,
  onCreateTemplate,
  onConnectIntegration,
  onFixManually,
}: ValidationWarningsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (warnings.length === 0) return null;

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'missing_template':
        return <Mail size={16} className="text-yellow-600" />;
      case 'missing_integration':
        return <Plug size={16} className="text-yellow-600" />;
      default:
        return <AlertTriangle size={16} className="text-yellow-600" />;
    }
  };

  const hasMissingTemplates = warnings.some(w => w.type === 'missing_template');
  const hasMissingIntegrations = warnings.some(w => w.type === 'missing_integration');

  return (
    <div className="mt-4">
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ Warnings ({warnings.length})
            </AlertDescription>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-yellow-700 hover:text-yellow-900 dark:text-yellow-300"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-2">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {getWarningIcon(warning.type)}
                <div className="flex-1">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    {warning.message}
                  </p>
                  {warning.line > 0 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Line {warning.line}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-yellow-200 dark:border-yellow-800">
              {hasMissingTemplates && onCreateTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateTemplate}
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:text-yellow-300 dark:border-yellow-700"
                >
                  <Mail size={14} className="mr-1" />
                  Create Template
                  <ExternalLink size={12} className="ml-1" />
                </Button>
              )}

              {hasMissingIntegrations && onConnectIntegration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onConnectIntegration}
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:text-yellow-300 dark:border-yellow-700"
                >
                  <Plug size={14} className="mr-1" />
                  Connect Integration
                  <ExternalLink size={12} className="ml-1" />
                </Button>
              )}

              {onFixManually && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFixManually}
                  className="text-yellow-700 hover:bg-yellow-100 dark:text-yellow-300"
                >
                  Fix Manually
                </Button>
              )}
            </div>
          </div>
        )}
      </Alert>
    </div>
  );
}
