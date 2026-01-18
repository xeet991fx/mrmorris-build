'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { deleteAgent } from '@/lib/api/agents';
import { IAgent } from '@/types/agent';

interface DeleteAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: IAgent;
  workspaceId: string;
  onSuccess?: () => void;
}

export function DeleteAgentModal({
  open,
  onOpenChange,
  agent,
  workspaceId,
  onSuccess
}: DeleteAgentModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isLive = agent.status === 'Live';

  const handleDelete = async (e: React.MouseEvent) => {
    // Prevent AlertDialog from auto-closing on action click
    e.preventDefault();
    setIsLoading(true);

    try {
      await deleteAgent(workspaceId, agent._id);
      toast.success('Agent deleted successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to delete agent';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-agent-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isLive ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Trash2 className="h-5 w-5 text-zinc-500" />
            )}
            Delete Agent
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLive ? (
              <>
                <span className="font-medium text-red-600">
                  This agent is Live and may have active executions.
                </span>
                <br />
                Delete &quot;{agent.name}&quot; anyway? This cannot be undone.
              </>
            ) : (
              <>
                Delete agent &quot;{agent.name}&quot;? This cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            data-testid="delete-cancel-button"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            data-testid="delete-confirm-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : isLive ? (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Force Delete
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Agent
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
