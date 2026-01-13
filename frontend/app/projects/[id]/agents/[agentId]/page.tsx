'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAgent } from '@/lib/api/agents';
import { IAgent } from '@/types/agent';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function AgentBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<IAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgent();
  }, [workspaceId, agentId]);

  const fetchAgent = async () => {
    try {
      setIsLoading(true);
      const response = await getAgent(workspaceId, agentId);
      if (response.success) {
        setAgent(response.agent);
      }
    } catch (error: any) {
      console.error('Error fetching agent:', error);
      toast.error('Failed to load agent');
      router.push(`/projects/${workspaceId}/agents`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'Paused':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'Draft':
      default:
        return 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading agent...</span>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${workspaceId}/agents`)}
            className="mb-4 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>

          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">{agent.name}</h1>
                <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{agent.goal}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Created {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Content - Placeholder for future stories */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-zinc-900 dark:text-zinc-100">Agent Builder</CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">Configure your agent's behavior and workflows</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                Agent configuration will be available in upcoming stories.
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You'll be able to configure triggers, instructions, restrictions, and more.
              </p>
            </div>

            {/* Future sections will include: */}
            {/* - Story 1.2: Trigger Configuration */}
            {/* - Story 1.3: Natural Language Instructions */}
            {/* - Story 1.4: Agent Restrictions */}
            {/* - Story 1.5: Agent Memory */}
            {/* - Story 1.6: Approval Requirements */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
