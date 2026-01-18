'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { duplicateAgent } from '@/lib/api/agents';
import { IAgent } from '@/types/agent';

interface DuplicateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: IAgent;
  workspaceId: string;
  onSuccess?: (newAgent: IAgent) => void;
}

export function DuplicateAgentModal({
  open,
  onOpenChange,
  agent,
  workspaceId,
  onSuccess
}: DuplicateAgentModalProps) {
  const [name, setName] = useState(`${agent.name} (Copy)`);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset name when agent changes or modal opens
  useEffect(() => {
    if (open) {
      setName(`${agent.name} (Copy)`);
      setError(null);
    }
  }, [open, agent.name]);

  const handleDuplicate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (name.trim().length > 100) {
      setError('Name cannot exceed 100 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await duplicateAgent(workspaceId, agent._id, { name: name.trim() });
      toast.success(`Agent "${response.agent.name}" created successfully`);
      onOpenChange(false);
      onSuccess?.(response.agent);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to duplicate agent';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="duplicate-agent-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Agent
          </DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{agent.name}&quot; with all configuration settings.
            The duplicate will be created in Draft status.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">New Agent Name</Label>
            <Input
              id="agent-name"
              data-testid="duplicate-agent-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Enter agent name"
              maxLength={100}
              disabled={isLoading}
              autoFocus
              aria-describedby={error ? 'duplicate-error-msg' : undefined}
              aria-invalid={!!error}
            />
            <p className="text-xs text-zinc-500">
              {name.length}/100 characters
            </p>
            {error && (
              <p id="duplicate-error-msg" className="text-xs text-red-500" data-testid="duplicate-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            data-testid="duplicate-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={isLoading || !name.trim()}
            data-testid="duplicate-confirm-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
