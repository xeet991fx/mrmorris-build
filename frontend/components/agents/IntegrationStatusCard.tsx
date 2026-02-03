'use client';

import { Integration } from '@/lib/api/integrations';
import { formatDistanceToNow } from 'date-fns';
import {
    SiGmail,
    SiLinkedin,
    SiSlack,
    SiGooglesheets,
    SiGooglecalendar,
} from 'react-icons/si';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

interface IntegrationStatusCardProps {
    integration: {
        id: string;
        name: string;
        icon: string;
    };
    credential: Integration | null;
    workspaceId: string;
    onConnectClick?: () => void;
}

export function IntegrationStatusCard({
    integration,
    credential,
    workspaceId,
    onConnectClick
}: IntegrationStatusCardProps) {
    const isConnected = credential?.status === 'Connected';
    const isExpired = credential?.status === 'Expired';
    const hasError = credential?.status === 'Error';

    // Story 5.4 Task 8.3: Calculate days until token expiration
    const daysUntilExpiry = credential?.expiresAt
        ? Math.ceil((new Date(credential.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
    const showExpiryWarning = isConnected && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;

    const getIntegrationIcon = (iconName: string) => {
        const iconClass = "w-5 h-5";

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
                return <GlobeAltIcon className={iconClass + " text-zinc-500"} />;
        }
    };

    const getStatusBadge = () => {
        if (isConnected) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Connected
                </span>
            );
        } else if (isExpired) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                    Expired
                </span>
            );
        } else if (hasError) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                    Error
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Not Connected
                </span>
            );
        }
    };

    return (
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-zinc-900 h-full flex flex-col">
            <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                        {getIntegrationIcon(integration.icon)}
                    </div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">
                        {integration.name}
                    </span>
                </div>
                <div className="flex-shrink-0">
                    {getStatusBadge()}
                </div>
            </div>

            {isConnected && credential && (
                <div className="space-y-1.5 mb-3">
                    {credential.profileInfo?.email && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1.5">
                            <span className="inline-block w-1 h-1 rounded-full bg-zinc-400"></span>
                            {credential.profileInfo.email}
                        </p>
                    )}
                    {credential.profileInfo?.name && !credential.profileInfo?.email && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1.5">
                            <span className="inline-block w-1 h-1 rounded-full bg-zinc-400"></span>
                            {credential.profileInfo.name}
                        </p>
                    )}
                    {credential.lastUsed && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5">
                            <span className="inline-block w-1 h-1 rounded-full bg-zinc-400"></span>
                            Last used {formatDistanceToNow(new Date(credential.lastUsed), { addSuffix: true })}
                        </p>
                    )}
                    {/* Story 5.4 Task 8.3: Show expiration warning if <7 days */}
                    {showExpiryWarning && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5 font-medium">
                            <span className="inline-block w-1 h-1 rounded-full bg-yellow-500"></span>
                            Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            )}

            <div className="mt-auto pt-2">
                {!isConnected && (
                    <button
                        onClick={onConnectClick}
                        className="w-full px-3 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                    >
                        Connect
                    </button>
                )}

                {isExpired && (
                    <button
                        onClick={onConnectClick}
                        className="w-full px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                    >
                        Reconnect
                    </button>
                )}

                {hasError && (
                    <button
                        onClick={onConnectClick}
                        className="w-full px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                        Fix Connection
                    </button>
                )}
            </div>
        </div>
    );
}
