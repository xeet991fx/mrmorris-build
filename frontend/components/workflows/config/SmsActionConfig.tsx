"use client";

import { WorkflowStep } from "@/lib/workflow/types";
import { LockClosedIcon, ExclamationTriangleIcon, LightBulbIcon } from "@heroicons/react/24/outline";

interface SmsActionConfigProps {
    step: WorkflowStep;
    onChange: (config: any) => void;
}

export default function SmsActionConfig({ step, onChange }: SmsActionConfigProps) {
    const config = step.config || {};

    return (
        <div className="space-y-4">
            {/* Provider Selection */}
            <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                    SMS Provider *
                </label>
                <select
                    value={config.provider || "twilio"}
                    onChange={(e) => onChange({ ...config, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="twilio">Twilio</option>
                    <option value="custom">Custom Webhook</option>
                </select>
            </div>

            {/* Twilio Configuration */}
            {config.provider === "twilio" && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-1.5">
                        <LockClosedIcon className="w-3.5 h-3.5" /> <strong>Security Note:</strong> Twilio credentials should be set as environment variables:
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-400 ml-4 list-disc space-y-1">
                        <li>
                            <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 py-0.5 rounded">
                                TWILIO_ACCOUNT_SID
                            </code>
                        </li>
                        <li>
                            <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 py-0.5 rounded">
                                TWILIO_AUTH_TOKEN
                            </code>
                        </li>
                    </ul>
                </div>
            )}

            {/* Custom Webhook Configuration */}
            {config.provider === "custom" && (
                <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Webhook URL *
                    </label>
                    <input
                        type="url"
                        value={config.webhookUrl || ""}
                        onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
                        placeholder="https://api.example.com/send-sms"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Your webhook will receive: {'{ from, to, message }'}
                    </p>
                </div>
            )}

            {/* From Number */}
            <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                    From Number *
                </label>
                <input
                    type="tel"
                    value={config.fromNumber || ""}
                    onChange={(e) => onChange({ ...config, fromNumber: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Your Twilio phone number in E.164 format (+country code + number)
                </p>
            </div>

            {/* Recipient Configuration */}
            <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Recipient Phone Number
                </label>

                <div className="space-y-3">
                    {/* Use Contact Field */}
                    <div>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="recipientType"
                                checked={!config.toNumber}
                                onChange={() => onChange({ ...config, toNumber: undefined })}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm text-foreground">Use contact's phone field</span>
                        </label>
                        {!config.toNumber && (
                            <input
                                type="text"
                                value={config.toField || "phone"}
                                onChange={(e) => onChange({ ...config, toField: e.target.value })}
                                placeholder="phone"
                                className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        )}
                    </div>

                    {/* Fixed Number */}
                    <div>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="recipientType"
                                checked={!!config.toNumber}
                                onChange={() => onChange({ ...config, toNumber: "" })}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm text-foreground">Use fixed number</span>
                        </label>
                        {config.toNumber !== undefined && (
                            <input
                                type="tel"
                                value={config.toNumber || ""}
                                onChange={(e) => onChange({ ...config, toNumber: e.target.value })}
                                placeholder="+1234567890"
                                className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Message */}
            <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Message *
                </label>
                <textarea
                    value={config.message || ""}
                    onChange={(e) => onChange({ ...config, message: e.target.value })}
                    placeholder="Hi {{firstName}}, your appointment is confirmed!"
                    rows={4}
                    maxLength={1600}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">
                        Use placeholders: {'{{firstName}}, {{lastName}}, {{email}}, {{phone}}'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                        {(config.message || "").length} / 1600
                    </span>
                </div>
            </div>

            {/* Character Counter Warning */}
            {config.message && config.message.length > 160 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                    <p className="text-xs text-orange-800 dark:text-orange-300 flex items-start gap-1.5">
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Message is longer than 160 characters and will be sent as multiple SMS segments.
                            Segments: {Math.ceil((config.message || "").length / 160)}</span>
                    </p>
                </div>
            )}

            {/* Help Text */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <LightBulbIcon className="w-3.5 h-3.5" /> <strong>Getting Started with Twilio:</strong>
                </p>
                <ol className="text-xs text-blue-700 dark:text-blue-400 ml-4 list-decimal mt-1 space-y-1">
                    <li>Sign up at twilio.com</li>
                    <li>Get a phone number from Twilio console</li>
                    <li>Copy Account SID and Auth Token</li>
                    <li>Set environment variables on your server</li>
                </ol>
            </div>
        </div>
    );
}
