'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ConflictWarningModalProps {
    open: boolean;
    onReload: () => void;
    onCancel?: () => void;
    updatedBy: string;
    updatedAt: string;
}

/**
 * Story 1.7: Conflict warning modal for optimistic locking
 * Shown when another user has modified the agent since it was loaded
 */
export function ConflictWarningModal({
    open,
    onReload,
    onCancel,
    updatedBy,
    updatedAt,
}: ConflictWarningModalProps) {
    // Format the date for display
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch {
            return dateStr;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel?.()}>
            <DialogContent className="sm:max-w-[425px]" data-testid="conflict-warning-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-orange-500" />
                        Conflict Detected
                    </DialogTitle>
                    <DialogDescription>
                        This agent was modified by <strong className="text-foreground">{updatedBy}</strong> at{' '}
                        <strong className="text-foreground">{formatDate(updatedAt)}</strong>.
                        <br />
                        <br />
                        Please reload to see the latest version before making changes.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel} data-testid="conflict-cancel-btn">
                            Cancel
                        </Button>
                    )}
                    <Button onClick={onReload} data-testid="conflict-reload-btn">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reload Agent
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
