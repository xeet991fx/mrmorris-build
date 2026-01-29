'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { getAgent, updateAgent } from '@/lib/api/agents';
import { IAgent, ITriggerConfig, IAgentRestrictions, IAgentMemory, IAgentApprovalConfig, MEMORY_DEFAULTS, APPROVAL_DEFAULTS, UpdateAgentInput } from '@/types/agent';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { TriggerConfiguration } from '@/components/agents/TriggerConfiguration';
import { InstructionsEditor } from '@/components/agents/InstructionsEditor';
import { InstructionExamples } from '@/components/agents/InstructionExamples';
import { RestrictionsConfiguration } from '@/components/agents/RestrictionsConfiguration';
import { MemoryConfiguration } from '@/components/agents/MemoryConfiguration';
import { ApprovalConfiguration } from '@/components/agents/ApprovalConfiguration';
import { LiveAgentWarningModal } from '@/components/agents/LiveAgentWarningModal';
import { ConflictWarningModal } from '@/components/agents/ConflictWarningModal';
import { TestModePanel } from '@/components/agents/TestModePanel';
import { ExecutionHistoryPanel } from '@/components/agents/ExecutionHistoryPanel';
import { AgentDashboard } from '@/components/agents/AgentDashboard';

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

  // Story 1.7: Optimistic locking state
  const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(null);

  // Story 1.7: Live agent warning modal state
  const [showLiveWarning, setShowLiveWarning] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<UpdateAgentInput | null>(null);

  // Story 1.7: Conflict warning modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{ updatedBy: string; updatedAt: string } | null>(null);

  // Story 1.7 Fix: Pending Live warning resolve callback for section saves
  const [pendingLiveWarningResolve, setPendingLiveWarningResolve] = useState<((confirmed: boolean) => void) | null>(null);

  // Story 2.1: Test Mode panel state
  const [isTestModePanelOpen, setIsTestModePanelOpen] = useState(false);

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
        // Story 1.7: Store original updatedAt for optimistic locking
        setOriginalUpdatedAt(response.agent.updatedAt);
      }
    } catch (error: any) {
      console.error('Error fetching agent:', error);
      // Story 1.7: Check for permission error
      if (error.response?.status === 403) {
        toast.error(error.response.data?.error || "You don't have permission to view this agent");
      } else {
        toast.error('Failed to load agent');
      }
      router.push(`/projects/${workspaceId}/agents`);
    } finally {
      setIsLoading(false);
    }
  };

  // Story 1.7: Handle 409 conflict errors
  const handleConflictError = (error: any) => {
    if (error.response?.status === 409 && error.response?.data?.conflict) {
      setConflictInfo(error.response.data.conflict);
      setShowConflictModal(true);
      return true;
    }
    return false;
  };

  // Story 1.7: Handle 403 permission errors
  const handlePermissionError = (error: any): boolean => {
    if (error.response?.status === 403) {
      toast.error(error.response.data?.error || "You don't have permission to edit agents");
      return true;
    }
    return false;
  };

  // Story 1.7: Unified save function with optimistic locking and Live agent warning
  const performSave = async (data: UpdateAgentInput): Promise<boolean> => {
    try {
      setIsSaving(true);

      // Include expectedUpdatedAt for optimistic locking
      const saveData: UpdateAgentInput = {
        ...data,
        expectedUpdatedAt: originalUpdatedAt || undefined
      };

      const response = await updateAgent(workspaceId, agentId, saveData);
      if (response.success) {
        setAgent(response.agent);
        setTriggers(response.agent.triggers || []);
        // Update originalUpdatedAt after successful save
        setOriginalUpdatedAt(response.agent.updatedAt);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error saving:', error);

      // Check for conflict first
      if (handleConflictError(error)) {
        return false;
      }

      // Check for permission error
      if (handlePermissionError(error)) {
        return false;
      }

      // Handle validation errors
      const details = error.response?.data?.details;
      const errorMessage = error.response?.data?.error || 'Failed to save';
      if (details && Array.isArray(details) && details.length > 0) {
        toast.error(`${errorMessage}: ${details.map((d: any) => d.message || d.path?.join('.') || d).join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Story 1.7: Save triggers with Live agent warning check
  const handleSaveTriggers = async () => {
    const saveData: UpdateAgentInput = { triggers };

    // Check if agent is Live and show warning
    if (agent?.status === 'Live') {
      setPendingSaveData(saveData);
      setShowLiveWarning(true);
      return;
    }

    const success = await performSave(saveData);
    if (success) {
      toast.success('Triggers saved successfully!');
    }
  };

  // Story 1.7: Confirm save after Live warning (unified handler for both triggers and sections)
  const handleConfirmLiveSave = async () => {
    handleConfirmLiveSaveFromSection();
  };

  // Story 1.7: Cancel Live warning (unified handler for both triggers and sections)
  const handleCancelLiveSave = () => {
    handleCancelLiveSaveFromSection();
  };

  // Story 1.7: Reload agent after conflict
  const handleReloadAfterConflict = () => {
    setShowConflictModal(false);
    setConflictInfo(null);
    fetchAgent();
    toast.info('Agent reloaded with latest changes');
  };

  // Story 1.7: Cancel conflict modal (allow user to copy changes first)
  const handleCancelConflict = () => {
    setShowConflictModal(false);
    // Don't clear conflictInfo so user can still see the message
  };

  // Story 1.7 Fix: Request Live warning for section saves - returns Promise<boolean>
  const requestLiveWarning = (): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingLiveWarningResolve(() => resolve);
      setShowLiveWarning(true);
    });
  };

  // Story 1.7 Fix: Handle Live warning confirmation for section saves
  const handleConfirmLiveSaveFromSection = () => {
    setShowLiveWarning(false);
    if (pendingLiveWarningResolve) {
      pendingLiveWarningResolve(true);
      setPendingLiveWarningResolve(null);
    }
    // Also handle trigger save pending data if present
    if (pendingSaveData) {
      performSave(pendingSaveData).then((success) => {
        if (success) {
          toast.success('Changes saved successfully!');
        }
      });
      setPendingSaveData(null);
    }
  };

  // Story 1.7 Fix: Handle Live warning cancel for section saves
  const handleCancelLiveSaveFromSection = () => {
    setShowLiveWarning(false);
    if (pendingLiveWarningResolve) {
      pendingLiveWarningResolve(false);
      setPendingLiveWarningResolve(null);
    }
    setPendingSaveData(null);
  };

  // Story 1.7 Fix: Handle conflict from section saves
  const handleSectionConflict = (info: { updatedBy: string; updatedAt: string }) => {
    setConflictInfo(info);
    setShowConflictModal(true);
  };

  // Story 1.7 Fix: Update originalUpdatedAt when sections save successfully
  const handleSectionSaveSuccess = (newUpdatedAt: string) => {
    setOriginalUpdatedAt(newUpdatedAt);
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
          data-testid="back-to-agents"
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
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100" data-testid="agent-name">
              {agent.name}
            </h1>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusStyles(agent.status)}`} data-testid="agent-status">
              {agent.status}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              {agent.goal}
            </span>
            <span className="text-xs text-zinc-400 hidden md:inline">
              · {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Story 2.1: Test Mode Button (AC1) - Only show when instructions exist */}
            {(agent.instructions && agent.instructions.trim()) && (
              <button
                onClick={() => setIsTestModePanelOpen(true)}
                className="px-4 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                data-testid="test-mode-btn"
              >
                <BeakerIcon className="h-4 w-4" />
                Test Mode
              </button>
            )}
            <button
              onClick={handleSaveTriggers}
              disabled={isSaving || triggers.length === 0}
              className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              data-testid="save-triggers-btn"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
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
              agentStatus={agent.status}
              expectedUpdatedAt={originalUpdatedAt}
              onConflict={handleSectionConflict}
              onUpdateSuccess={handleSectionSaveSuccess}
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
              agentStatus={agent.status}
              expectedUpdatedAt={originalUpdatedAt}
              onConflict={handleSectionConflict}
              onUpdateSuccess={handleSectionSaveSuccess}
              onLiveWarningRequired={requestLiveWarning}
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
              agentStatus={agent.status}
              expectedUpdatedAt={originalUpdatedAt}
              onConflict={handleSectionConflict}
              onUpdateSuccess={handleSectionSaveSuccess}
              onLiveWarningRequired={requestLiveWarning}
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
              agentStatus={agent.status}
              expectedUpdatedAt={originalUpdatedAt}
              onConflict={handleSectionConflict}
              onUpdateSuccess={handleSectionSaveSuccess}
              onLiveWarningRequired={requestLiveWarning}
            />
          </div>

          {/* Story 3.15: Performance Dashboard Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <AgentDashboard
              workspaceId={workspaceId}
              agentId={agentId}
            />
          </div>

          {/* Story 3.13: Execution History Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <ExecutionHistoryPanel
              workspaceId={workspaceId}
              agentId={agentId}
            />
          </div>
        </div>
      </div>

      {/* Story 1.7: Live Agent Warning Modal */}
      <LiveAgentWarningModal
        open={showLiveWarning}
        onConfirm={handleConfirmLiveSave}
        onCancel={handleCancelLiveSave}
        agentName={agent.name}
      />

      {/* Story 1.7: Conflict Warning Modal */}
      {conflictInfo && (
        <ConflictWarningModal
          open={showConflictModal}
          onReload={handleReloadAfterConflict}
          onCancel={handleCancelConflict}
          updatedBy={conflictInfo.updatedBy}
          updatedAt={conflictInfo.updatedAt}
        />
      )}

      {/* Story 2.1: Test Mode Panel */}
      <TestModePanel
        open={isTestModePanelOpen}
        onOpenChange={setIsTestModePanelOpen}
        workspaceId={workspaceId}
        agentId={agentId}
        agentName={agent.name}
        hasInstructions={Boolean(agent.instructions && agent.instructions.trim())}
      />
    </div>
  );
}

