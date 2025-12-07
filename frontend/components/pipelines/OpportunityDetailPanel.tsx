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
} from '@heroicons/react/24/outline';
import { Opportunity } from '@/lib/api/opportunity';
import ActivityTimeline from './ActivityTimeline';
import FileUploadZone from './FileUploadZone';
import LogEmailModal from './LogEmailModal';
import LogCallModal from './LogCallModal';
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
  const [activeTab, setActiveTab] = useState<'activity' | 'files'>('activity');
  const [showLogEmail, setShowLogEmail] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);

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
