'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createAgent } from '@/lib/api/agents';
import {
  createAgentSchema,
  CreateAgentFormData,
} from '@/lib/validations/agentValidation';

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function CreateAgentModal({
  open,
  onOpenChange,
  workspaceId,
}: CreateAgentModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<CreateAgentFormData>({
    resolver: zodResolver(createAgentSchema),
  });

  const nameValue = watch('name') || '';
  const goalValue = watch('goal') || '';

  const onSubmit = async (data: CreateAgentFormData) => {
    try {
      setIsLoading(true);
      const response = await createAgent(workspaceId, data);

      if (response.success) {
        toast.success('Agent created successfully!');
        reset();
        onOpenChange(false);

        // Redirect to agent builder page
        router.push(`/projects/${workspaceId}/agents/${response.agent._id}`);
      }
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast.error(
        error.response?.data?.error || 'Failed to create agent. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Set up a new automation agent for your sales team. You can configure
            triggers and actions after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            {/* Agent Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Agent Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Lead Follow-up Agent"
                {...register('name')}
                autoFocus
                disabled={isLoading}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {errors.name ? (
                  <span className="text-red-500">{errors.name.message}</span>
                ) : (
                  <span>The name of your agent</span>
                )}
                <span className={nameValue.length > 100 ? 'text-red-500' : ''}>
                  {nameValue.length}/100
                </span>
              </div>
            </div>

            {/* Agent Goal */}
            <div className="grid gap-2">
              <Label htmlFor="goal">
                Agent Goal <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="goal"
                placeholder="e.g., Automatically follow up with leads who haven't responded in 3 days"
                {...register('goal')}
                rows={4}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {errors.goal ? (
                  <span className="text-red-500">{errors.goal.message}</span>
                ) : (
                  <span>What should this agent accomplish?</span>
                )}
                <span className={goalValue.length > 500 ? 'text-red-500' : ''}>
                  {goalValue.length}/500
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || nameValue.length > 100 || goalValue.length > 500}
            >
              {isLoading ? 'Creating...' : 'Create Draft Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
