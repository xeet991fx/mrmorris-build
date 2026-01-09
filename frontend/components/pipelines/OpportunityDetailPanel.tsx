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
            {/* Backdrop - no blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 z-40"
            />

            {/* Panel - narrower width */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full md:w-[420px] lg:w-[480px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('text-xl flex-shrink-0', temperatureColor)} title={temperature}>
                      {temperatureIcon}
                    </span>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {opportunity.title}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Key Metrics - Flat design */}
                <div className="px-4 pb-3 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Value</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(opportunity.value, opportunity.currency, false)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Probability</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {opportunity.probability || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Days</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{daysInStage}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Activity</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {formatRelativeTime(opportunity.lastActivityAt)}
                    </p>
                  </div>
                </div>

                {/* Contact & Company Info - inline text */}
                {(contactName || companyName) && (
                  <div className="px-4 pb-3 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {contactName && (
                      <div className="flex items-center gap-1.5">
                        <UserCircleIcon className="w-4 h-4" />
                        <span>{contactName}</span>
                      </div>
                    )}
                    {companyName && (
                      <div className="flex items-center gap-1.5">
                        <BuildingOfficeIcon className="w-4 h-4" />
                        <span>{companyName}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions - Rounded buttons */}
                <div className="px-5 pb-4 flex gap-2">
                  <button
                    onClick={() => setShowLogEmail(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full transition-colors text-sm font-medium"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    onClick={() => setShowLogCall(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full transition-colors text-sm font-medium"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    Call
                  </button>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(opportunity)}
                      className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-full transition-colors text-sm shadow-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {/* Tabs - Pill style */}
                <div className="px-5 pt-2 flex gap-1 bg-zinc-50 dark:bg-zinc-800/50">
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors',
                      activeTab === 'activity'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    )}
                  >
                    <ClockIcon className="w-4 h-4" />
                    Activity
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors',
                      activeTab === 'files'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    )}
                  >
                    <PaperClipIcon className="w-4 h-4" />
                    Files
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors',
                      activeTab === 'ai'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    )}
                  >
                    <SparklesIcon className="w-4 h-4" />
                    AI
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
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
                  <div className="space-y-4">
                    {/* Analyze Button */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Analysis</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Get AI-powered insights</p>
                      </div>
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isAnalyzing ? (
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <SparklesIcon className="w-3.5 h-3.5" />
                        )}
                        {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                      </button>
                    </div>

                    {/* AI Score Card */}
                    {aiInsights && (
                      <div className="grid grid-cols-2 gap-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Deal Score</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {aiInsights.dealScore}<span className="text-sm text-zinc-400">/100</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Win Probability</p>
                          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {aiInsights.closeProbability}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Risk Factors */}
                    {aiInsights?.riskFactors && aiInsights.riskFactors.length > 0 && (
                      <div className="py-3 border-b border-zinc-200 dark:border-zinc-800">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">
                          <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                          Risk Factors
                        </h4>
                        <ul className="space-y-1.5">
                          {aiInsights.riskFactors.map((risk, i) => (
                            <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {aiInsights?.recommendedActions && aiInsights.recommendedActions.length > 0 && (
                      <div className="py-3 border-b border-zinc-200 dark:border-zinc-800">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wide">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          Recommended Actions
                        </h4>
                        <ul className="space-y-1.5">
                          {aiInsights.recommendedActions.map((action, i) => (
                            <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                              <span className="text-emerald-500 font-semibold">{i + 1}.</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Action Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="py-3">
                        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                          <SparklesIcon className="w-3.5 h-3.5" />
                          Next Steps
                        </h4>
                        <div className="space-y-2">
                          {suggestions.map((suggestion, i) => (
                            <div key={i} className="py-2 border-l-2 border-zinc-300 dark:border-zinc-600 pl-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-zinc-900 dark:text-zinc-100">{suggestion.action}</p>
                                <span className={cn(
                                  'text-[10px] uppercase tracking-wide font-medium shrink-0',
                                  suggestion.urgency === 'high' && 'text-red-500',
                                  suggestion.urgency === 'medium' && 'text-amber-500',
                                  suggestion.urgency === 'low' && 'text-blue-500'
                                )}>
                                  {suggestion.urgency}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{suggestion.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Analysis Yet */}
                    {!aiInsights && !isAnalyzing && (
                      <div className="text-center py-8">
                        <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No analysis yet</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Click Analyze to get started</p>
                      </div>
                    )}

                    {/* Confidence indicator */}
                    {aiInsights?.confidenceLevel && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center uppercase tracking-wide">
                        Confidence: {aiInsights.confidenceLevel}% •
                        {aiInsights.lastAnalyzedAt ? new Date(aiInsights.lastAnalyzedAt).toLocaleDateString() : 'Unknown'}
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
