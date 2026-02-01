'use client';

import {
    SiGmail,
    SiLinkedin,
    SiSlack,
    SiGooglesheets,
    SiGooglecalendar,
} from 'react-icons/si';

interface IntegrationAccessToggleProps {
    integration: {
        id: string;
        name: string;
    };
    isConnected: boolean;
    isAllowed: boolean;
    onToggle: (integrationId: string, enabled: boolean) => void;
    disabled?: boolean;
}

export function IntegrationAccessToggle({
    integration,
    isConnected,
    isAllowed,
    onToggle,
    disabled = false
}: IntegrationAccessToggleProps) {
    const getIntegrationIcon = (integrationId: string) => {
        const iconClass = "w-4 h-4";

        switch (integrationId) {
            case 'gmail':
                return <SiGmail className={iconClass} style={{ color: '#EA4335' }} />;
            case 'linkedin':
                return <SiLinkedin className={iconClass} style={{ color: '#0A66C2' }} />;
            case 'slack':
                return <SiSlack className={iconClass} style={{ color: '#4A154B' }} />;
            case 'apollo':
                return (
                    <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-purple-500 to-pink-500" />
                );
            case 'google-calendar':
                return <SiGooglecalendar className={iconClass} style={{ color: '#4285F4' }} />;
            case 'google-sheets':
                return <SiGooglesheets className={iconClass} style={{ color: '#0F9D58' }} />;
            default:
                return null;
        }
    };

    return (
        <label
            className={`flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors ${
                !isConnected || disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer'
            }`}
        >
            <input
                type="checkbox"
                checked={isAllowed}
                onChange={(e) => onToggle(integration.id, e.target.checked)}
                disabled={!isConnected || disabled}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0">
                    {getIntegrationIcon(integration.id)}
                </div>
                <div className="flex-1 min-w-0">
                    <span
                        className={`text-sm font-medium ${
                            !isConnected
                                ? 'text-zinc-400 dark:text-zinc-500'
                                : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                    >
                        {integration.name}
                    </span>
                    {!isConnected && (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                            (Not connected)
                        </span>
                    )}
                </div>
            </div>
        </label>
    );
}
