'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import {
    SiGmail,
    SiLinkedin,
    SiSlack,
    SiGooglesheets,
    SiGooglecalendar,
} from 'react-icons/si';
import { getIntegrations, connectIntegration, Integration } from '@/lib/api/integrations';
import { VALID_INTEGRATIONS } from '@/types/agent';
import { toast } from 'sonner';

interface IntegrationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

const mapIntegrationIdToBackendType = (frontendId: string): string => {
    const mapping: Record<string, string> = {
        'google-calendar': 'calendar',
        'google-sheets': 'google_sheets',
    };
    return mapping[frontendId] || frontendId;
};

export function IntegrationsModal({ isOpen, onClose, workspaceId }: IntegrationsModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [connectingId, setConnectingId] = useState<string | null>(null);

    // Fetch integrations
    const fetchIntegrations = async () => {
        try {
            setIsLoading(true);
            const response = await getIntegrations(workspaceId);
            if (response.success) {
                setIntegrations(response.data?.integrations || []);
            }
        } catch (error) {
            console.error('Error fetching integrations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchIntegrations();
            setSearchQuery(''); // Reset search when opening
        }
    }, [isOpen, workspaceId]);

    // Get integration credential by type
    const getIntegrationCredential = (integrationId: string): Integration | null => {
        const backendType = mapIntegrationIdToBackendType(integrationId);
        return integrations.find((i) => i.type === backendType) || null;
    };

    // Get integration icon
    const getIntegrationIcon = (iconName: string) => {
        const iconClass = "w-8 h-8";
        switch (iconName) {
            case 'mail':
                return <SiGmail className={iconClass} style={{ color: '#EA4335' }} />;
            case 'linkedin':
                return <SiLinkedin className={iconClass} style={{ color: '#0A66C2' }} />;
            case 'slack':
                return <SiSlack className={iconClass} style={{ color: '#4A154B' }} />;
            case 'database':
                return (
                    <svg className={iconClass} fill="url(#apolloGradient)" viewBox="0 0 24 24">
                        <defs>
                            <linearGradient id="apolloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                        </defs>
                        <path d="M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4zm0 2c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3zm0 16c-4.42 0-8-1.34-8-3v-2.3c1.87 1.24 4.77 2.05 8 2.05s6.13-.81 8-2.05V18c0 1.66-3.58 3-8 3zm0-6c-4.42 0-8-1.34-8-3V8.7c1.87 1.24 4.77 2.05 8 2.05s6.13-.81 8-2.05V12c0 1.66-3.58 3-8 3z" />
                    </svg>
                );
            case 'calendar':
                return <SiGooglecalendar className={iconClass} style={{ color: '#4285F4' }} />;
            case 'table':
                return <SiGooglesheets className={iconClass} style={{ color: '#0F9D58' }} />;
            default:
                return <div className={iconClass + " bg-zinc-200 dark:bg-zinc-700 rounded"}></div>;
        }
    };

    // Get status indicator
    const getStatusIndicator = (credential: Integration | null) => {
        if (!credential) {
            return {
                icon: <div className="w-3 h-3 bg-zinc-300 dark:bg-zinc-600 rounded-full" />,
                text: 'Not Connected',
                color: 'text-zinc-500 dark:text-zinc-400',
                bgColor: 'bg-zinc-50 dark:bg-zinc-800/50',
                borderColor: 'border-zinc-200 dark:border-zinc-700',
            };
        }

        if (credential.status === 'Connected') {
            // Check if expiring soon
            if (credential.expiresAt) {
                const daysUntilExpiry = Math.ceil(
                    (new Date(credential.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                );
                if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                    return {
                        icon: <ClockIcon className="w-4 h-4 text-amber-500" />,
                        text: `Expires in ${daysUntilExpiry}d`,
                        color: 'text-amber-600 dark:text-amber-400',
                        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
                        borderColor: 'border-amber-200 dark:border-amber-800',
                    };
                }
            }
            return {
                icon: <CheckCircleIcon className="w-4 h-4 text-green-500" />,
                text: 'Connected',
                color: 'text-green-600 dark:text-green-400',
                bgColor: 'bg-green-50 dark:bg-green-900/20',
                borderColor: 'border-green-200 dark:border-green-800',
            };
        } else if (credential.status === 'Expired') {
            return {
                icon: <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />,
                text: 'Expired',
                color: 'text-red-600 dark:text-red-400',
                bgColor: 'bg-red-50 dark:bg-red-900/20',
                borderColor: 'border-red-200 dark:border-red-800',
            };
        } else if (credential.status === 'Error') {
            return {
                icon: <XCircleIcon className="w-4 h-4 text-orange-500" />,
                text: 'Error',
                color: 'text-orange-600 dark:text-orange-400',
                bgColor: 'bg-orange-50 dark:bg-orange-900/20',
                borderColor: 'border-orange-200 dark:border-orange-800',
            };
        }

        return {
            icon: <div className="w-3 h-3 bg-zinc-300 rounded-full" />,
            text: 'Unknown',
            color: 'text-zinc-500',
            bgColor: 'bg-zinc-50',
            borderColor: 'border-zinc-200',
        };
    };

    // Handle connect
    const handleConnect = async (integrationType: string) => {
        setConnectingId(integrationType);
        try {
            let authUrl: string;

            // Use legacy calendar OAuth flow
            if (integrationType === 'google-calendar') {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/calendar/connect/google?workspaceId=${workspaceId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                    }
                );
                const data = await response.json();
                if (!data.success || !data.data?.authUrl) {
                    toast.error(data.error || 'Failed to get authorization URL');
                    return;
                }
                authUrl = data.data.authUrl;
            } else {
                // Use new OAuth flow
                let provider: 'gmail' | 'linkedin' | 'google-calendar' = 'gmail';
                if (integrationType === 'gmail') provider = 'gmail';
                else if (integrationType === 'linkedin') provider = 'linkedin';
                else {
                    toast.error(`OAuth connection for ${integrationType} not yet implemented`);
                    return;
                }

                const response = await connectIntegration(workspaceId, provider);
                if (!response.success || !response.data?.authUrl) {
                    toast.error(response.error || 'Failed to get authorization URL');
                    return;
                }
                authUrl = response.data.authUrl;
            }

            // Open OAuth popup
            const width = 600;
            const height = 800;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                authUrl,
                'OAuth Authorization',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Poll for popup closure
            const pollInterval = setInterval(() => {
                if (!popup || popup.closed) {
                    clearInterval(pollInterval);
                    fetchIntegrations();
                    toast.success('Integration connected successfully!');
                }
            }, 500);

            setTimeout(() => {
                clearInterval(pollInterval);
                if (popup && !popup.closed) {
                    popup.close();
                }
            }, 300000);
        } catch (error: any) {
            console.error('Error connecting integration:', error);
            toast.error('Failed to connect integration');
        } finally {
            setConnectingId(null);
        }
    };

    // Filter and sort integrations
    const processedIntegrations = useMemo(() => {
        let filtered = VALID_INTEGRATIONS.map((integration) => ({
            ...integration,
            credential: getIntegrationCredential(integration.id),
        }));

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort: Connected first, then expiring, then not connected
        filtered.sort((a, b) => {
            const aStatus = a.credential?.status || 'None';
            const bStatus = b.credential?.status || 'None';

            const statusOrder: Record<string, number> = {
                'Connected': 0,
                'Expired': 1,
                'Error': 2,
                'None': 3,
            };

            // Check if expiring soon (within 7 days)
            const getExpiryPriority = (cred: Integration | null) => {
                if (!cred || cred.status !== 'Connected' || !cred.expiresAt) return 999;
                const days = Math.ceil(
                    (new Date(cred.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                );
                if (days <= 7 && days > 0) return -1; // Expiring soon - show first
                return 999;
            };

            const aExpiry = getExpiryPriority(a.credential);
            const bExpiry = getExpiryPriority(b.credential);

            if (aExpiry !== bExpiry) return aExpiry - bExpiry;
            return statusOrder[aStatus] - statusOrder[bStatus];
        });

        return filtered;
    }, [integrations, searchQuery]);

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog
                    as={motion.div}
                    static
                    open={isOpen}
                    onClose={onClose}
                    className="relative z-50"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Full-screen container */}
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel
                            as={motion.div}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                                <div>
                                    <Dialog.Title className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                        Workspace Integrations
                                    </Dialog.Title>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                        Connect and manage your third-party services
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Search integrations..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                                    />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                                {isLoading ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div
                                                key={i}
                                                className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : processedIntegrations.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-zinc-500 dark:text-zinc-400">
                                            No integrations found matching "{searchQuery}"
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {processedIntegrations.map((item) => {
                                            const status = getStatusIndicator(item.credential);
                                            const isConnected = item.credential?.status === 'Connected';
                                            const isConnecting = connectingId === item.id;

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    className={`relative border-2 ${status.borderColor} ${status.bgColor} rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group`}
                                                    onClick={() => !isConnected && !isConnecting && handleConnect(item.id)}
                                                >
                                                    {/* Integration Icon */}
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center shadow-sm">
                                                            {getIntegrationIcon(item.icon)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                                {item.name}
                                                            </h3>
                                                            <div className={`flex items-center gap-1 text-xs ${status.color} mt-1`}>
                                                                {status.icon}
                                                                <span>{status.text}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Account Info */}
                                                    {item.credential?.profileInfo?.email && (
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mb-3">
                                                            {item.credential.profileInfo.email}
                                                        </p>
                                                    )}

                                                    {/* Action Button */}
                                                    {isConnected ? (
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            Click to manage
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                                isConnecting
                                                                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                                                    : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                                                            }`}
                                                            disabled={isConnecting}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleConnect(item.id);
                                                            }}
                                                        >
                                                            {isConnecting ? 'Connecting...' : 'Connect'}
                                                        </button>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                                    Manage your integrations from Settings → Integrations for advanced options
                                </p>
                            </div>
                        </Dialog.Panel>
                    </div>
                </Dialog>
            )}
        </AnimatePresence>
    );
}
