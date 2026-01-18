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
import { AlertTriangle } from 'lucide-react';

interface LiveAgentWarningModalProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    agentName: string;
}

/**
 * Story 1.7: Warning modal displayed when editing a Live agent
 * Warns the user that changes will affect active executions
 */
export function LiveAgentWarningModal({
    open,
    onConfirm,
    onCancel,
    agentName,
}: LiveAgentWarningModalProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="sm:max-w-[425px]" data-testid="live-agent-warning-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Edit Live Agent
                    </DialogTitle>
                    <DialogDescription>
                        Agent &quot;{agentName}&quot; is Live. Changes will affect active executions.
                        Are you sure you want to continue?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        data-testid="live-warning-cancel"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        data-testid="live-warning-confirm"
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
