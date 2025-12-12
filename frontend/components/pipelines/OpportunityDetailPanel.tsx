import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  PaperClipIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Opportunity } from '@/lib/api/opportunity';
import ActivityTimeline from './ActivityTimeline';
import FileUploadZone from './FileUploadZone';
import LogEmailModal from './LogEmailModal';
import LogCallModal from './LogCallModal';
import { analyzeOpportunity, getAISuggestions, AIInsights, NextActionSuggestion } from '@/lib/api/ai';
import toast from 'react-hot-toast';
import {
  formatCurrency,
  formatRelativeTime,
  getDaysInStage,
  calculateDealTemperature,
  getTemperatureIcon,
  getTemperatureColor,
} from '@/lib/utils/opportunityUtils';
import { cn } from '@/lib/utils';

interface OpportunityDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  workspaceId: string;
  onEdit?: (opportunity: Opportunity) => void;
}

export default function OpportunityDetailPanel({
  isOpen,
  onClose,
  opportunity,
  workspaceId,
  onEdit,
}: OpportunityDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'files' | 'ai'>('activity');
  const [showLogEmail, setShowLogEmail] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [suggestions, setSuggestions] = useState<NextActionSuggestion[]>([]);

  // Load cached AI insights on mount
  const loadAIData = async () => {
    if (opportunity?.aiInsights) {
      setAiInsights(opportunity.aiInsights as unknown as AIInsights);
    }
  };

  const handleAnalyze = async () => {
    if (!workspaceId || !opportunity) return;
    setIsAnalyzing(true);
    try {
      const [analysisResult, suggestionsResult] = await Promise.all([
        analyzeOpportunity(workspaceId, opportunity._id),
        getAISuggestions(workspaceId, opportunity._id),
      ]);

      if (analysisResult.success && analysisResult.data) {
        setAiInsights(analysisResult.data.insights);
        toast.success('AI analysis complete!');
      } else {
        toast.error(analysisResult.error || 'Analysis failed');
      }

      if (suggestionsResult.success && suggestionsResult.data) {
        setSuggestions(suggestionsResult.data.suggestions || []);
      }
    } catch (error) {
      toast.error('Failed to analyze opportunity');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!opportunity) return null;

  const contact =
    typeof opportunity.contactId === 'object' ? opportunity.contactId : null;
  const company =
    typeof opportunity.companyId === 'object' ? opportunity.companyId : null;

  const contactName = contact
    ? `${(contact as any).firstName} ${(contact as any).lastName}`
    : null;
  const companyName = company ? (company as any).name : null;

  const daysInStage = getDaysInStage(opportunity);
  const temperature = opportunity.dealTemperature || calculateDealTemperature(opportunity);
  const temperatureIcon = getTemperatureIcon(temperature);
  const temperatureColor = getTemperatureColor(temperature);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[700px] bg-neutral-900 border-l border-neutral-700 shadow-xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex-shrink-0 border-b border-neutral-700">
                {/* Top Bar */}
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-2xl', temperatureColor)} title={temperature}>
                      {temperatureIcon}
                    </span>
                    <h2 className="text-xl font-semibold text-white">{opportunity.title}</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Key Metrics */}
                <div className="px-6 pb-4 grid grid-cols-2 gap-4">
                  {/* Value */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Deal Value</p>
                    <p className="text-lg font-bold text-[#84cc16]">
                      {formatCurrency(opportunity.value, opportunity.currency, false)}
                    </p>
                  </div>

                  {/* Probability */}
                  {opportunity.probability && (
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Close Probability</p>
                      <p className="text-lg font-bold text-white">{opportunity.probability}%</p>
                    </div>
                  )}

                  {/* Days in Stage */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Days in Stage</p>
                    <p className="text-lg font-bold text-white">{daysInStage} days</p>
                  </div>

                  {/* Last Activity */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Last Activity</p>
                    <p className="text-lg font-bold text-white">
                      {formatRelativeTime(opportunity.lastActivityAt)}
                    </p>
                  </div>
                </div>

                {/* Contact & Company Info */}
                {(contactName || companyName) && (
                  <div className="px-6 pb-4 space-y-2">
                    {contactName && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserCircleIcon className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-300">{contactName}</span>
                      </div>
                    )}
                    {companyName && (
                      <div className="flex items-center gap-2 text-sm">
                        <BuildingOfficeIcon className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-300">{companyName}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="px-6 pb-4 flex gap-2">
                  <button
                    onClick={() => setShowLogEmail(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    Log Email
                  </button>
                  <button
                    onClick={() => setShowLogCall(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    Log Call
                  </button>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(opportunity)}
                      className="px-4 py-2 bg-[#84cc16] text-black font-medium rounded-lg hover:bg-[#9ACD32] transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="px-6 flex gap-4 border-t border-neutral-800">
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === 'activity'
                        ? 'border-[#84cc16] text-[#84cc16]'
                        : 'border-transparent text-neutral-400 hover:text-white'
                    )}
                  >
                    <ClockIcon className="w-4 h-4 inline mr-2" />
                    Activity Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={cn(
                      'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === 'files'
                        ? 'border-[#84cc16] text-[#84cc16]'
                        : 'border-transparent text-neutral-400 hover:text-white'
                    )}
                  >
                    <PaperClipIcon className="w-4 h-4 inline mr-2" />
                    Files
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={cn(
                      'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === 'ai'
                        ? 'border-[#84cc16] text-[#84cc16]'
                        : 'border-transparent text-neutral-400 hover:text-white'
                    )}
                  >
                    <SparklesIcon className="w-4 h-4 inline mr-2" />
                    AI Insights
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'activity' && (
                  <ActivityTimeline
                    workspaceId={workspaceId}
                    opportunityId={opportunity._id}
                  />
                )}

                {activeTab === 'files' && (
                  <FileUploadZone
                    workspaceId={workspaceId}
                    opportunityId={opportunity._id}
                  />
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    {/* Analyze Button */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                        <p className="text-sm text-neutral-400">Get AI-powered insights for this deal</p>
                      </div>
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-lg hover:from-violet-500 hover:to-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <SparklesIcon className="w-4 h-4" />
                        )}
                        {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                      </button>
                    </div>

                    {/* AI Score Card */}
                    {aiInsights && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-lg p-4">
                          <p className="text-sm text-violet-300 mb-1">Deal Score</p>
                          <p className="text-3xl font-bold text-white">
                            {aiInsights.dealScore}
                            <span className="text-lg text-neutral-400">/100</span>
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg p-4">
                          <p className="text-sm text-emerald-300 mb-1">Close Probability</p>
                          <p className="text-3xl font-bold text-white">
                            {aiInsights.closeProbability}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Risk Factors */}
                    {aiInsights?.riskFactors && aiInsights.riskFactors.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-3">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          Risk Factors
                        </h4>
                        <ul className="space-y-2">
                          {aiInsights.riskFactors.map((risk, i) => (
                            <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">•</span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {aiInsights?.recommendedActions && aiInsights.recommendedActions.length > 0 && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-3">
                          <CheckCircleIcon className="w-4 h-4" />
                          Recommended Actions
                        </h4>
                        <ul className="space-y-2">
                          {aiInsights.recommendedActions.map((action, i) => (
                            <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                              <span className="text-emerald-400 mt-0.5">{i + 1}.</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Action Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3">
                          <SparklesIcon className="w-4 h-4" />
                          Suggested Next Actions
                        </h4>
                        <div className="space-y-3">
                          {suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-neutral-800/50 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-white">{suggestion.action}</p>
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded-full font-medium',
                                  suggestion.urgency === 'high' && 'bg-red-500/20 text-red-400',
                                  suggestion.urgency === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                                  suggestion.urgency === 'low' && 'bg-blue-500/20 text-blue-400'
                                )}>
                                  {suggestion.urgency}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 mt-1">{suggestion.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Analysis Yet */}
                    {!aiInsights && !isAnalyzing && (
                      <div className="text-center py-8 text-neutral-500">
                        <SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No AI analysis yet</p>
                        <p className="text-sm mt-1">Click &quot;Analyze with AI&quot; to get started</p>
                      </div>
                    )}

                    {/* Confidence indicator */}
                    {aiInsights?.confidenceLevel && (
                      <p className="text-xs text-neutral-500 text-center">
                        AI Confidence: {aiInsights.confidenceLevel}% •
                        Last analyzed: {aiInsights.lastAnalyzedAt ? new Date(aiInsights.lastAnalyzedAt).toLocaleString() : 'Unknown'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      {opportunity && (
        <>
          <LogEmailModal
            isOpen={showLogEmail}
            onClose={() => setShowLogEmail(false)}
            workspaceId={workspaceId}
            opportunity={opportunity}
            onSuccess={() => {
              // Refresh activity timeline
              setActiveTab('activity');
            }}
          />

          <LogCallModal
            isOpen={showLogCall}
            onClose={() => setShowLogCall(false)}
            workspaceId={workspaceId}
            opportunity={opportunity}
            onSuccess={() => {
              // Refresh activity timeline
              setActiveTab('activity');
            }}
          />
        </>
      )}
    </>
  );
}
