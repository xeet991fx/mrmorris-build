'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Lightbulb, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * ReviewSuggestionsPanel Component
 * Story 4.4, Task 6: Display categorized review suggestions
 *
 * Renders three sections:
 * - ✅ Good: Positive feedback on what's working well
 * - ⚠️ Suggestions: Issues that need improvement
 * - 💡 Optimizations: Performance and efficiency improvements
 */

interface Suggestion {
  category: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
}

interface Optimization {
  issue: string;
  suggestion: string;
  before?: string;
  after?: string;
}

interface ValidationWarnings {
  missingTemplates?: string[];
  availableTemplates?: string[];
  missingFields?: string[];
  availableFields?: string[];
}

interface ReviewSuggestionsPanelProps {
  good: string[];
  suggestions: Suggestion[];
  optimizations: Optimization[];
  validationWarnings?: ValidationWarnings;
  onApply: (suggestionText: string, type: 'suggestion' | 'optimization', index: number) => void;
  onDismiss: (type: 'suggestion' | 'optimization', index: number) => void;
  onClose: () => void;
}

export default function ReviewSuggestionsPanel({
  good,
  suggestions,
  optimizations,
  validationWarnings,
  onApply,
  onDismiss,
  onClose,
}: ReviewSuggestionsPanelProps) {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  const [dismissedOptimizations, setDismissedOptimizations] = useState<Set<number>>(new Set());

  const handleDismiss = (type: 'suggestion' | 'optimization', index: number) => {
    if (type === 'suggestion') {
      setDismissedSuggestions(prev => new Set(prev).add(index));
    } else {
      setDismissedOptimizations(prev => new Set(prev).add(index));
    }
    onDismiss(type, index);
  };

  const handleApply = (suggestionText: string, type: 'suggestion' | 'optimization', index: number) => {
    onApply(suggestionText, type, index);
  };

  // Filter out dismissed items
  const visibleSuggestions = suggestions.filter((_, idx) => !dismissedSuggestions.has(idx));
  const visibleOptimizations = optimizations.filter((_, idx) => !dismissedOptimizations.has(idx));

  const totalItems = good.length + visibleSuggestions.length + visibleOptimizations.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Instruction Review
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} found
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Good Section (AC1, AC8) */}
          {good.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  What's Working Well
                </h3>
                <Badge variant="outline" className="ml-auto">
                  {good.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {good.map((item, index) => (
                  <Card key={index} className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-700">{item}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Suggestions Section (AC1, AC2, AC4, AC5) */}
          {visibleSuggestions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Suggested Improvements
                </h3>
                <Badge variant="outline" className="ml-auto">
                  {visibleSuggestions.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {visibleSuggestions.map((item, index) => {
                  const originalIndex = suggestions.indexOf(item);
                  return (
                    <Card key={originalIndex} className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  item.priority === 'high'
                                    ? 'destructive'
                                    : item.priority === 'medium'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="text-xs"
                              >
                                {item.priority}
                              </Badge>
                              <span className="text-xs text-gray-500 capitalize">
                                {item.category.replace('_', ' ')}
                              </span>
                            </div>
                            <CardTitle className="text-base text-gray-900">
                              {item.issue}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-700 mb-3">{item.suggestion}</p>
                        {item.example && (
                          <div className="bg-white p-3 rounded border border-amber-200 mt-3">
                            <p className="text-xs text-gray-500 mb-1">Example:</p>
                            <p className="text-sm text-gray-800 font-mono">{item.example}</p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleApply(item.suggestion, 'suggestion', originalIndex)}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismiss('suggestion', originalIndex)}
                            className="text-gray-600"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Optimizations Section (AC1, AC3) */}
          {visibleOptimizations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Optimization Opportunities
                </h3>
                <Badge variant="outline" className="ml-auto">
                  {visibleOptimizations.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {visibleOptimizations.map((item, index) => {
                  const originalIndex = optimizations.indexOf(item);
                  return (
                    <Card key={originalIndex} className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-gray-900">
                          {item.issue}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-700 mb-3">{item.suggestion}</p>
                        {item.before && item.after && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-red-50 p-3 rounded border border-red-200">
                              <p className="text-xs text-red-600 font-medium mb-1">Before:</p>
                              <p className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                                {item.before}
                              </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-xs text-green-600 font-medium mb-1">After:</p>
                              <p className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                                {item.after}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleApply(item.after || item.suggestion, 'optimization', originalIndex)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismiss('optimization', originalIndex)}
                            className="text-gray-600"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Resource Validation Warnings Section (AC6, Task 9) */}
          {validationWarnings && (validationWarnings.missingTemplates?.length || validationWarnings.missingFields?.length) ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Resource Validation Warnings
                </h3>
              </div>
              <div className="space-y-3">
                {/* Missing Templates (Task 9.2, 9.3) */}
                {validationWarnings.missingTemplates && validationWarnings.missingTemplates.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-red-900">
                        ⚠️ Missing Email Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-red-700 mb-3">
                        The following templates were not found in your workspace:
                      </p>
                      <div className="space-y-2 mb-4">
                        {validationWarnings.missingTemplates.map((template, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-red-200">
                            <code className="text-sm text-red-800">{template}</code>
                          </div>
                        ))}
                      </div>
                      {validationWarnings.availableTemplates && validationWarnings.availableTemplates.length > 0 && (
                        <>
                          <p className="text-sm text-gray-700 mb-2 font-medium">
                            Available templates in your workspace:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {validationWarnings.availableTemplates.map((template, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer hover:bg-emerald-100 border-emerald-300 text-emerald-700"
                                onClick={() => {
                                  navigator.clipboard.writeText(template);
                                  toast.success(`Copied "${template}" to clipboard`);
                                }}
                                title="Click to copy"
                              >
                                {template}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Missing Custom Fields (Task 9.4, 9.5) */}
                {validationWarnings.missingFields && validationWarnings.missingFields.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-red-900">
                        ⚠️ Missing Custom Fields
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-red-700 mb-3">
                        The following custom fields were not found:
                      </p>
                      <div className="space-y-2 mb-4">
                        {validationWarnings.missingFields.map((field, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-red-200">
                            <code className="text-sm text-red-800">@contact.{field}</code>
                          </div>
                        ))}
                      </div>
                      {validationWarnings.availableFields && validationWarnings.availableFields.length > 0 && (
                        <>
                          <p className="text-sm text-gray-700 mb-2 font-medium">
                            Available custom fields:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {validationWarnings.availableFields.map((field, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer hover:bg-emerald-100 border-emerald-300 text-emerald-700"
                                onClick={() => {
                                  navigator.clipboard.writeText(`@contact.${field}`);
                                  toast.success(`Copied "@contact.${field}" to clipboard`);
                                }}
                                title="Click to copy"
                              >
                                @contact.{field}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          ) : null}

          {/* Empty State */}
          {totalItems === 0 && !validationWarnings?.missingTemplates?.length && !validationWarnings?.missingFields?.length && (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Looking Good!
              </h3>
              <p className="text-gray-600">
                No suggestions or improvements found. Your instructions are well-structured.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Review powered by AI • {visibleSuggestions.length + visibleOptimizations.length} actionable items
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
