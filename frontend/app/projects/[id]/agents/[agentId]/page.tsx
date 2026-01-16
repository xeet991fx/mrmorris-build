'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getAgent, updateAgent } from '@/lib/api/agents';
import { IAgent, ITriggerConfig, IAgentRestrictions, IAgentMemory, IAgentApprovalConfig, MEMORY_DEFAULTS, APPROVAL_DEFAULTS } from '@/types/agent';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { TriggerConfiguration } from '@/components/agents/TriggerConfiguration';
import { InstructionsEditor } from '@/components/agents/InstructionsEditor';
import { InstructionExamples } from '@/components/agents/InstructionExamples';
import { RestrictionsConfiguration } from '@/components/agents/RestrictionsConfiguration';
import { MemoryConfiguration } from '@/components/agents/MemoryConfiguration';
import { ApprovalConfiguration } from '@/components/agents/ApprovalConfiguration';

export default function AgentBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<IAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [triggers, setTriggers] = useState<ITriggerConfig[]>([]);
  // Story 1.3: Instructions state
  const [instructions, setInstructions] = useState<string>('');
  // Story 1.4: Restrictions state
  const [restrictions, setRestrictions] = useState<IAgentRestrictions | null>(null);
  // Story 1.5: Memory state
  const [memory, setMemory] = useState<IAgentMemory | null>(null);
  // Story 1.6: Approval configuration state
  const [approvalConfig, setApprovalConfig] = useState<IAgentApprovalConfig | null>(null);

  useEffect(() => {
    fetchAgent();
  }, [workspaceId, agentId]);

  const fetchAgent = async () => {
    try {
      setIsLoading(true);
      const response = await getAgent(workspaceId, agentId);
      if (response.success) {
        setAgent(response.agent);
        setTriggers(response.agent.triggers || []);
        setInstructions(response.agent.instructions || '');
        setRestrictions(response.agent.restrictions || null);
        // Story 1.5: Set memory state
        setMemory(response.agent.memory || MEMORY_DEFAULTS);
        // Story 1.6: Set approval config state
        setApprovalConfig(response.agent.approvalConfig || APPROVAL_DEFAULTS);
      }
    } catch (error: any) {
      console.error('Error fetching agent:', error);
      toast.error('Failed to load agent');
      router.push(`/projects/${workspaceId}/agents`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTriggers = async () => {
    try {
      setIsSaving(true);
      const response = await updateAgent(workspaceId, agentId, { triggers });
      if (response.success) {
        setAgent(response.agent);
        setTriggers(response.agent.triggers || []);
        toast.success('Triggers saved successfully!');
      }
    } catch (error: any) {
      console.error('Error saving triggers:', error);
      // Extract detailed validation errors from response if available
      const details = error.response?.data?.details;
      const errorMessage = error.response?.data?.error || 'Failed to save triggers';
      if (details && Array.isArray(details) && details.length > 0) {
        toast.error(`${errorMessage}: ${details.map((d: any) => d.message || d.path?.join('.') || d).join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Story 1.3: Handle instructions save callback
  const handleInstructionsSaved = (newInstructions: string) => {
    setInstructions(newInstructions);
    if (agent) {
      setAgent({ ...agent, instructions: newInstructions });
    }
  };

  // Story 1.3 Fix: Handle copy-to-editor from examples
  const handleCopyToEditor = (text: string) => {
    setInstructions(text);
    if (agent) {
      setAgent({ ...agent, instructions: text });
    }
  };

  // Story 1.4: Handle restrictions save callback
  const handleRestrictionsSaved = (newRestrictions: IAgentRestrictions) => {
    setRestrictions(newRestrictions);
    if (agent) {
      setAgent({ ...agent, restrictions: newRestrictions });
    }
  };

  // Story 1.5: Handle memory save callback
  const handleMemorySaved = (newMemory: IAgentMemory) => {
    setMemory(newMemory);
    if (agent) {
      setAgent({ ...agent, memory: newMemory });
    }
  };

  // Story 1.6: Handle approval config save callback
  const handleApprovalSaved = (newApprovalConfig: IAgentApprovalConfig) => {
    setApprovalConfig(newApprovalConfig);
    if (agent) {
      setAgent({ ...agent, approvalConfig: newApprovalConfig });
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Live':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Paused':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex-shrink-0">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/projects/${workspaceId}/agents`)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Agents
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {agent.name}
            </h1>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusStyles(agent.status)}`}>
              {agent.status}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              {agent.goal}
            </span>
            <span className="text-xs text-zinc-400 hidden md:inline">
              · {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
            </span>
          </div>
          <button
            onClick={handleSaveTriggers}
            disabled={isSaving || triggers.length === 0}
            className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl space-y-6">
          {/* Triggers Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <TriggerConfiguration
              triggers={triggers}
              onChange={setTriggers}
              disabled={isSaving}
            />
          </div>

          {/* Story 1.3: Instructions Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <InstructionsEditor
              agentId={agentId}
              workspaceId={workspaceId}
              initialInstructions={agent.instructions || null}
              onSave={handleInstructionsSaved}
              disabled={isSaving}
            />
          </div>

          {/* Story 1.3: Instruction Examples */}
          <InstructionExamples onCopyToEditor={handleCopyToEditor} />

          {/* Story 1.4: Restrictions Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <RestrictionsConfiguration
              workspaceId={workspaceId}
              agentId={agentId}
              initialRestrictions={restrictions}
              onSave={handleRestrictionsSaved}
              disabled={isSaving}
            />
          </div>

          {/* Story 1.5: Memory Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <MemoryConfiguration
              workspaceId={workspaceId}
              agentId={agentId}
              initialMemory={memory}
              onSave={handleMemorySaved}
              disabled={isSaving}
            />
          </div>

          {/* Story 1.6: Approval Configuration Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <ApprovalConfiguration
              workspaceId={workspaceId}
              agentId={agentId}
              initialApprovalConfig={approvalConfig}
              onSave={handleApprovalSaved}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
