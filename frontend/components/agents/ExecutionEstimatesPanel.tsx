'use client';

/**
 * Story 2.5: ExecutionEstimatesPanel Component
 * 
 * Displays estimated execution time and AI credit cost for test runs.
 * AC1: Display time and credit estimates after test
 * AC4: Distinguish active time vs wait time
 * AC5: Show range for conditional branches
 * AC7: Show previous test comparison
 * AC8: Show scheduled agent monthly projections
 */

import { Clock, Coins, TrendingUp, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ExecutionEstimate, StoredEstimate } from '@/types/agent';

interface ExecutionEstimatesPanelProps {
    estimates: ExecutionEstimate | null;
    previousEstimates?: StoredEstimate | null;
    showProjections?: boolean;
}

/**
 * Format milliseconds to human-readable duration for display.
 */
function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
}

export function ExecutionEstimatesPanel({
    estimates,
    previousEstimates,
    showProjections = true,
}: ExecutionEstimatesPanelProps) {
    if (!estimates) return null;

    const hasWaitTime = estimates.waitTimeDisplay !== null;

    // Calculate deltas for comparison (AC7)
    const timeDelta = previousEstimates
        ? estimates.activeTimeMs - previousEstimates.time
        : null;
    const creditsDelta = previousEstimates
        ? estimates.totalCredits - previousEstimates.credits
        : null;

    return (
        <TooltipProvider>
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                {/* Execution Time Display with Delta Indicator (AC7) */}
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-sm">
                            {hasWaitTime
                                ? `${estimates.activeTimeDisplay} active`
                                : estimates.activeTimeDisplay
                            }
                        </span>
                        {/* AC7: Time delta indicator */}
                        {timeDelta !== null && timeDelta !== 0 && (
                            <span className={`flex items-center text-xs ${timeDelta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {timeDelta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {formatMs(Math.abs(timeDelta))}
                            </span>
                        )}
                        {hasWaitTime && (
                            <span className="text-muted-foreground text-sm">
                                + {estimates.waitTimeDisplay} wait
                            </span>
                        )}
                    </div>
                </div>

                {/* AI Credits Display with Breakdown Tooltip */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                            <Coins className="h-4 w-4 text-amber-500" />
                            <span className="font-medium text-sm">{estimates.creditsDisplay}</span>
                            {creditsDelta !== null && creditsDelta !== 0 && (
                                <span className={`flex items-center text-xs ${creditsDelta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {creditsDelta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                    {Math.abs(creditsDelta)}
                                </span>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <div className="text-sm space-y-1">
                            <p className="font-medium mb-2">Credit Breakdown:</p>
                            {estimates.creditBreakdown.map((item, i) => (
                                <p key={i} className="text-muted-foreground">
                                    {item.label}: {item.credits} credit{item.credits !== 1 ? 's' : ''}
                                </p>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>

                {/* AC6: Bulk Action Info Display */}
                {estimates.bulkActions && estimates.bulkActions.length > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help text-sm text-muted-foreground border-l border-border/50 pl-3">
                                <span>Bulk: {estimates.bulkActions[0].display}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <div className="text-sm space-y-1">
                                <p className="font-medium mb-2">Bulk Actions:</p>
                                {estimates.bulkActions.map((bulk, i) => (
                                    <p key={i} className="text-muted-foreground">
                                        {bulk.display}
                                    </p>
                                ))}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Previous Test Comparison (AC7) */}
                {previousEstimates && (
                    <div className="text-xs text-muted-foreground border-l border-border/50 pl-3">
                        <span>Previous: {formatMs(previousEstimates.time)} / {previousEstimates.credits} credits</span>
                    </div>
                )}

                {/* Monthly Projection for Scheduled Agents (AC8) */}
                {showProjections && estimates.monthlyProjection !== undefined && estimates.monthlyProjection > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">
                            ~{estimates.monthlyProjection} credits/month
                        </span>
                        {estimates.monthlyProjection > 100 && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>High monthly usage. Monitor credit consumption.</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

export default ExecutionEstimatesPanel;
