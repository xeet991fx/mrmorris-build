'use client';

import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * ApplyInstructionsButton Component
 * Story 4.2, Task 4.2
 *
 * Button to apply generated instructions to agent form with warning badges
 */

interface ValidationWarning {
  type: 'missing_template' | 'missing_field' | 'missing_integration' | 'invalid_syntax';
  message: string;
  line: number;
}

interface ApplyInstructionsButtonProps {
  generatedInstructions: string;
  onApply: (instructions: string) => void;
  warnings?: ValidationWarning[];
}

export default function ApplyInstructionsButton({
  generatedInstructions,
  onApply,
  warnings = [],
}: ApplyInstructionsButtonProps) {
  const handleClick = () => {
    onApply(generatedInstructions);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        onClick={handleClick}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
      >
        <Check size={16} className="mr-2" />
        Apply Instructions
      </Button>

      {warnings.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">
                <AlertTriangle size={12} />
                <span>{warnings.length}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold mb-1">Warnings:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {warnings.slice(0, 3).map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                  {warnings.length > 3 && (
                    <li>+{warnings.length - 3} more warnings</li>
                  )}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
