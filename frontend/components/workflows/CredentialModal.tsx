/**
 * Credential Management Modal
 *
 * Allows users to manage integration credentials (Slack, Google Sheets, Notion, etc.)
 *
 * Features:
 * - List existing credentials for workspace
 * - Add new credential (OAuth2 flow or manual API key)
 * - Test credential validity
 * - Delete credential
 * - Select credential for use in workflow step
 */

"use client";

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

export type IntegrationType = 'slack' | 'google_sheets' | 'notion' | 'gmail' | 'calendar';

interface Credential {
    _id: string;
    name: string;
    type: IntegrationType;
    isValid: boolean;
    lastValidated?: string;
    validationError?: string;
    createdAt: string;
}

interface CredentialModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    integrationType: IntegrationType;
    onCredentialSelected?: (credentialId: string) => void;
}

const INTEGRATION_NAMES: Record<IntegrationType, string> = {
    slack: 'Slack',
    google_sheets: 'Google Sheets',
    notion: 'Notion',
    gmail: 'Gmail',
    calendar: 'Google Calendar',
};

const OAUTH_INTEGRATIONS: IntegrationType[] = ['slack', 'google_sheets', 'notion', 'gmail', 'calendar'];

export default function CredentialModal({
    isOpen,
    onClose,
    workspaceId,
    integrationType,
    onCredentialSelected,
}: CredentialModalProps) {
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Manual credential entry (for API key integrations)
    const [manualEntry, setManualEntry] = useState({
        name: '',
        apiKey: '',
    });

    const integrationName = INTEGRATION_NAMES[integrationType];
    const isOAuthIntegration = OAUTH_INTEGRATIONS.includes(integrationType);

    useEffect(() => {
        if (isOpen) {
            fetchCredentials();
        }
    }, [isOpen, workspaceId, integrationType]);

    async function fetchCredentials() {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/credentials?type=${integrationType}`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch credentials');
            }

            const data = await response.json();
            setCredentials(data.credentials || []);
        } catch (error: any) {
            console.error('Fetch credentials error:', error);
            toast.error('Failed to load credentials');
        } finally {
            setIsLoading(false);
        }
    }

    async function startOAuthFlow() {
        try {
            setIsAdding(true);

            // Get OAuth authorization URL from backend
            const response = await fetch(
                `/api/integrations/${integrationType}/oauth/authorize?workspaceId=${workspaceId}`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to start OAuth flow');
            }

            const data = await response.json();

            // Open OAuth popup
            const width = 600;
            const height = 800;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                data.url,
                'oauth_popup',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Poll for popup close
            const pollInterval = setInterval(() => {
                if (popup?.closed) {
                    clearInterval(pollInterval);
                    setIsAdding(false);
                    // Refresh credentials list
                    fetchCredentials();
                    toast.success('Credential added successfully!');
                }
            }, 500);
        } catch (error: any) {
            console.error('OAuth flow error:', error);
            toast.error(error.message || 'Failed to connect');
            setIsAdding(false);
        }
    }

    async function saveManualCredential() {
        if (!manualEntry.name || !manualEntry.apiKey) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            setIsAdding(true);

            const response = await fetch(`/api/workspaces/${workspaceId}/credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    type: integrationType,
                    name: manualEntry.name,
                    data: { apiKey: manualEntry.apiKey },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save credential');
            }

            toast.success('Credential saved successfully!');
            setManualEntry({ name: '', apiKey: '' });
            fetchCredentials();
        } catch (error: any) {
            console.error('Save credential error:', error);
            toast.error(error.message || 'Failed to save credential');
        } finally {
            setIsAdding(false);
        }
    }

    async function testCredential(credentialId: string) {
        setTestingId(credentialId);
        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/credentials/${credentialId}/validate`,
                {
                    method: 'POST',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Validation failed');
            }

            const data = await response.json();

            if (data.isValid) {
                toast.success('Credential is valid!');
            } else {
                toast.error('Credential is invalid');
            }

            fetchCredentials();
        } catch (error: any) {
            console.error('Test credential error:', error);
            toast.error('Failed to test credential');
        } finally {
            setTestingId(null);
        }
    }

    async function deleteCredential(credentialId: string) {
        if (!confirm('Are you sure you want to delete this credential?')) {
            return;
        }

        setDeletingId(credentialId);
        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/credentials/${credentialId}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete credential');
            }

            toast.success('Credential deleted');
            fetchCredentials();
        } catch (error: any) {
            console.error('Delete credential error:', error);
            toast.error('Failed to delete credential');
        } finally {
            setDeletingId(null);
        }
    }

    function handleSelectCredential(credentialId: string) {
        if (onCredentialSelected) {
            onCredentialSelected(credentialId);
        }
        onClose();
    }

    function handleClose() {
        setManualEntry({ name: '', apiKey: '' });
        onClose();
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog
                    as={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    open={isOpen}
                    onClose={handleClose}
                    className="relative z-50"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel
                            as={motion.div}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                                <div>
                                    <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {integrationName} Credentials
                                    </Dialog.Title>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Manage your {integrationName} connections
                                    </p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Loading State */}
                                {isLoading && (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                )}

                                {/* Existing Credentials */}
                                {!isLoading && credentials.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                                            Saved Credentials
                                        </h3>
                                        {credentials.map((cred) => (
                                            <div
                                                key={cred._id}
                                                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    {cred.isValid ? (
                                                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                    ) : (
                                                        <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {cred.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {cred.isValid
                                                                ? `Last validated ${new Date(cred.lastValidated!).toLocaleDateString()}`
                                                                : cred.validationError || 'Invalid'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => testCredential(cred._id)}
                                                        disabled={testingId === cred._id}
                                                    >
                                                        {testingId === cred._id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            'Test'
                                                        )}
                                                    </Button>
                                                    {onCredentialSelected && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSelectCredential(cred._id)}
                                                        >
                                                            Use This
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => deleteCredential(cred._id)}
                                                        disabled={deletingId === cred._id}
                                                    >
                                                        {deletingId === cred._id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <TrashIcon className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* No Credentials Message */}
                                {!isLoading && credentials.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-muted-foreground">
                                            No credentials configured yet
                                        </p>
                                    </div>
                                )}

                                {/* Add New Credential */}
                                {!isLoading && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                                            Add New Credential
                                        </h3>

                                        {isOAuthIntegration ? (
                                            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    Connect your {integrationName} account securely using OAuth
                                                </p>
                                                <Button
                                                    onClick={startOAuthFlow}
                                                    disabled={isAdding}
                                                    className="w-full"
                                                >
                                                    {isAdding ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Connecting...
                                                        </>
                                                    ) : (
                                                        `Connect with ${integrationName}`
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="credential-name">Name</Label>
                                                    <Input
                                                        id="credential-name"
                                                        value={manualEntry.name}
                                                        onChange={(e) =>
                                                            setManualEntry({ ...manualEntry, name: e.target.value })
                                                        }
                                                        placeholder="My Credential"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="api-key">API Key</Label>
                                                    <Input
                                                        id="api-key"
                                                        type="password"
                                                        value={manualEntry.apiKey}
                                                        onChange={(e) =>
                                                            setManualEntry({ ...manualEntry, apiKey: e.target.value })
                                                        }
                                                        placeholder="Enter API key"
                                                    />
                                                </div>
                                                <Button
                                                    onClick={saveManualCredential}
                                                    disabled={isAdding || !manualEntry.name || !manualEntry.apiKey}
                                                    className="w-full"
                                                >
                                                    {isAdding ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        'Save Credential'
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Dialog.Panel>
                    </div>
                </Dialog>
            )}
        </AnimatePresence>
    );
}
