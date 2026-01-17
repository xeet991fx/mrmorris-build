"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    SparklesIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    DocumentTextIcon,
    CheckIcon,
    ArrowPathIcon,
    EnvelopeIcon,
    DevicePhoneMobileIcon,
    PencilSquareIcon,
    LightBulbIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    RocketLaunchIcon,
    ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";

// Icon mapping for template types
const getTemplateTypeIcon = (iconName: string) => {
    const iconClasses = "w-6 h-6";
    switch (iconName) {
        case "email":
            return <EnvelopeIcon className={iconClasses} />;
        case "linkedin":
            return (
                <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
            );
        case "sms":
            return <DevicePhoneMobileIcon className={iconClasses} />;
        case "slack":
            return (
                <svg className={iconClasses} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
            );
        case "proposal":
            return <DocumentTextIcon className={iconClasses} />;
        case "other":
            return <PencilSquareIcon className={iconClasses} />;
        default:
            return <DocumentTextIcon className={iconClasses} />;
    }
};

import {
    generateTemplate,
    TEMPLATE_TYPES,
    TEMPLATE_PURPOSES,
    TEMPLATE_TONES,
    TEMPLATE_LENGTHS,
    INDUSTRIES,
    TARGET_AUDIENCES,
    CTA_OPTIONS,
    TemplateType,
    TemplatePurpose,
    TemplateTone,
    TemplateLength,
    GeneratedTemplate,
} from "@/lib/api/templateGenerator";

// ============================================
// TYPES
// ============================================

interface AITemplateGeneratorModalProps {
    isOpen: boolean;
    workspaceId: string;
    onClose: () => void;
    onSave: (template: { name: string; subject: string; body: string; category: string }) => void;
}

type WizardStep = "type" | "context" | "purpose" | "details" | "preview";

// Prompt suggestions based on purpose
const PROMPT_SUGGESTIONS: Record<TemplatePurpose, string[]> = {
    "welcome": [
        "Include onboarding next steps",
        "Mention key features to explore",
        "Add a personal touch with founder message",
        "Include helpful resources or links",
    ],
    "follow-up": [
        "Reference the previous conversation",
        "Add a specific value proposition",
        "Include a clear next step",
        "Create urgency without being pushy",
    ],
    "sales-pitch": [
        "Highlight the main pain point you solve",
        "Include social proof or testimonials",
        "Mention a limited-time offer",
        "Add ROI or success metrics",
    ],
    "announcement": [
        "Lead with the most exciting news",
        "Explain what this means for them",
        "Include a launch date or timeline",
        "Add exclusive early access offer",
    ],
    "thank-you": [
        "Be specific about what you're thanking them for",
        "Mention the impact they've made",
        "Include a small surprise or bonus",
        "Invite them to stay connected",
    ],
    "introduction": [
        "Keep it brief and memorable",
        "Mention a mutual connection if any",
        "Share one compelling fact about your company",
        "End with a soft call to action",
    ],
    "reminder": [
        "Reference the original context",
        "Add new value or information",
        "Create appropriate urgency",
        "Make it easy to take action",
    ],
    "custom": [
        "Be specific about your goal",
        "Describe your ideal outcome",
        "Mention any constraints or requirements",
        "Include examples if helpful",
    ],
};

// ============================================
// STEP COMPONENTS
// ============================================

function StepIndicator({ currentStep, steps }: { currentStep: WizardStep; steps: WizardStep[] }) {
    const stepIndex = steps.indexOf(currentStep);

    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${index < stepIndex
                            ? "bg-[#9ACD32] text-background"
                            : index === stepIndex
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                    >
                        {index < stepIndex ? <CheckIcon className="w-4 h-4" /> : index + 1}
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={`w-12 h-0.5 mx-1 ${index < stepIndex ? "bg-[#9ACD32]" : "bg-muted"
                                }`}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function TypeStep({
    selectedType,
    onSelect,
}: {
    selectedType: TemplateType | null;
    onSelect: (type: TemplateType) => void;
}) {
    return (
        <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">What type of template?</h3>
            <p className="text-sm text-muted-foreground mb-6">
                Choose the platform or format for your template
            </p>
            <div className="grid grid-cols-2 gap-3">
                {TEMPLATE_TYPES.map((type) => (
                    <button
                        key={type.value}
                        onClick={() => onSelect(type.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all hover:border-primary ${selectedType === type.value
                            ? "border-[#9ACD32] bg-[#9ACD32]/10"
                            : "border-border hover:bg-muted/50"
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${selectedType === type.value
                            ? "bg-[#9ACD32]/20 text-[#9ACD32]"
                            : "bg-muted text-muted-foreground"
                            }`}>
                            {getTemplateTypeIcon(type.icon)}
                        </div>
                        <span className="font-medium text-foreground">{type.label}</span>
                        <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

function ContextStep({
    industry,
    targetAudience,
    companyName,
    productService,
    onIndustryChange,
    onAudienceChange,
    onCompanyChange,
    onProductChange,
}: {
    industry: string;
    targetAudience: string;
    companyName: string;
    productService: string;
    onIndustryChange: (value: string) => void;
    onAudienceChange: (value: string) => void;
    onCompanyChange: (value: string) => void;
    onProductChange: (value: string) => void;
}) {
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                <LightBulbIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                <p className="text-sm text-violet-700 dark:text-violet-300">
                    Better context = better templates. Help the AI understand your business.
                </p>
            </div>

            {/* Company Name */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    Company / Brand Name
                </label>
                <input
                    type="text"
                    value={companyName}
                    onChange={(e) => onCompanyChange(e.target.value)}
                    placeholder="e.g., Acme Inc, TechStartup"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>

            {/* Product/Service */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <RocketLaunchIcon className="w-4 h-4" />
                    Product / Service
                </label>
                <input
                    type="text"
                    value={productService}
                    onChange={(e) => onProductChange(e.target.value)}
                    placeholder="e.g., CRM software, Marketing automation platform"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>

            {/* Industry */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    Industry
                </label>
                <select
                    value={industry}
                    onChange={(e) => onIndustryChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="">Select your industry...</option>
                    {INDUSTRIES.map((ind) => (
                        <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                </select>
            </div>

            {/* Target Audience */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <UserGroupIcon className="w-4 h-4" />
                    Target Audience
                </label>
                <select
                    value={targetAudience}
                    onChange={(e) => onAudienceChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="">Who are you writing to?</option>
                    {TARGET_AUDIENCES.map((aud) => (
                        <option key={aud.value} value={aud.value}>{aud.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function PurposeStep({
    selectedPurpose,
    selectedTone,
    onSelectPurpose,
    onSelectTone,
}: {
    selectedPurpose: TemplatePurpose | null;
    selectedTone: TemplateTone | null;
    onSelectPurpose: (purpose: TemplatePurpose) => void;
    onSelectTone: (tone: TemplateTone) => void;
}) {
    return (
        <div className="space-y-6">
            {/* Purpose */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">What's the purpose?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Select the main goal of this template
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {TEMPLATE_PURPOSES.map((purpose) => (
                        <button
                            key={purpose.value}
                            onClick={() => onSelectPurpose(purpose.value)}
                            className={`p-3 rounded-lg border text-left transition-all ${selectedPurpose === purpose.value
                                ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                : "border-border hover:bg-muted/50"
                                }`}
                        >
                            <span className="font-medium text-foreground text-sm">{purpose.label}</span>
                            <p className="text-xs text-muted-foreground">{purpose.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tone */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">What tone?</h3>
                <p className="text-sm text-muted-foreground mb-4">Choose the voice and style</p>
                <div className="grid grid-cols-2 gap-2">
                    {TEMPLATE_TONES.map((tone) => (
                        <button
                            key={tone.value}
                            onClick={() => onSelectTone(tone.value)}
                            className={`p-3 rounded-lg border text-left transition-all ${selectedTone === tone.value
                                ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                : "border-border hover:bg-muted/50"
                                }`}
                        >
                            <span className="font-medium text-foreground text-sm">{tone.label}</span>
                            <p className="text-xs text-muted-foreground">{tone.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DetailsStep({
    selectedLength,
    additionalDetails,
    callToAction,
    painPoints,
    uniqueValue,
    selectedPurpose,
    onSelectLength,
    onDetailsChange,
    onCtaChange,
    onPainPointsChange,
    onUniqueValueChange,
}: {
    selectedLength: TemplateLength | null;
    additionalDetails: string;
    callToAction: string;
    painPoints: string;
    uniqueValue: string;
    selectedPurpose: TemplatePurpose | null;
    onSelectLength: (length: TemplateLength) => void;
    onDetailsChange: (details: string) => void;
    onCtaChange: (cta: string) => void;
    onPainPointsChange: (value: string) => void;
    onUniqueValueChange: (value: string) => void;
}) {
    const suggestions = selectedPurpose ? PROMPT_SUGGESTIONS[selectedPurpose] : [];

    return (
        <div className="space-y-5">
            {/* Length */}
            <div>
                <h3 className="text-base font-semibold text-foreground mb-2">Template Length</h3>
                <div className="flex gap-2">
                    {TEMPLATE_LENGTHS.map((length) => (
                        <button
                            key={length.value}
                            onClick={() => onSelectLength(length.value)}
                            className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${selectedLength === length.value
                                ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                : "border-border hover:bg-muted/50"
                                }`}
                        >
                            <span className="font-medium text-foreground text-sm">{length.label}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{length.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Call to Action */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <RocketLaunchIcon className="w-4 h-4" />
                    Call to Action
                </label>
                <select
                    value={callToAction}
                    onChange={(e) => onCtaChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                    <option value="">Select a call to action...</option>
                    {CTA_OPTIONS.map((cta) => (
                        <option key={cta.value} value={cta.value}>{cta.label}</option>
                    ))}
                </select>
                {callToAction && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                        Example: "{CTA_OPTIONS.find(c => c.value === callToAction)?.example}"
                    </p>
                )}
            </div>

            {/* Pain Points */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                    Pain Points to Address
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                    type="text"
                    value={painPoints}
                    onChange={(e) => onPainPointsChange(e.target.value)}
                    placeholder="e.g., Time-consuming manual tasks, lack of visibility, high costs"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>

            {/* Unique Value */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <SparklesIcon className="w-4 h-4" />
                    Unique Value / Key Benefit
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                    type="text"
                    value={uniqueValue}
                    onChange={(e) => onUniqueValueChange(e.target.value)}
                    placeholder="e.g., 50% time savings, AI-powered automation, 24/7 support"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>

            {/* Additional Details with Suggestions */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <PencilSquareIcon className="w-4 h-4" />
                    Additional Instructions
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                    value={additionalDetails}
                    onChange={(e) => onDetailsChange(e.target.value)}
                    placeholder="Any specific details, context, or requirements..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />

                {/* Smart Suggestions */}
                {suggestions.length > 0 && (
                    <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <LightBulbIcon className="w-3.5 h-3.5" />
                            Pro tips for {selectedPurpose} templates:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        const newDetails = additionalDetails
                                            ? `${additionalDetails}\n- ${suggestion}`
                                            : `- ${suggestion}`;
                                        onDetailsChange(newDetails);
                                    }}
                                    className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    + {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PreviewStep({
    generated,
    isLoading,
    error,
    onRegenerate,
}: {
    generated: GeneratedTemplate | null;
    isLoading: boolean;
    error: string | null;
    onRegenerate: () => void;
}) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                    <SparklesIcon className="w-16 h-16 text-[#9ACD32] animate-pulse" />
                    <div className="absolute inset-0 animate-spin">
                        <div className="w-16 h-16 border-2 border-transparent border-t-[#9ACD32] rounded-full" />
                    </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">
                    Generating with AI...
                </h3>
                <p className="text-sm text-muted-foreground">
                    Gemini 2.5 Pro is crafting your template
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                    <XMarkIcon className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Generation Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <button
                    onClick={onRegenerate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    Try Again
                </button>
            </div>
        );
    }

    if (!generated) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{generated.name}</h3>
                <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    Regenerate
                </button>
            </div>

            {generated.subject && (
                <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                    <p className="text-sm text-foreground">{generated.subject}</p>
                </div>
            )}

            <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-xs text-muted-foreground mb-2">Body:</p>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                        {generated.body}
                    </pre>
                </div>
            </div>

            {generated.variables && generated.variables.length > 0 && (
                <div>
                    <p className="text-xs text-muted-foreground mb-2">Variables used:</p>
                    <div className="flex flex-wrap gap-1">
                        {generated.variables.map((v) => (
                            <code
                                key={v}
                                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                            >
                                {`{{${v}}}`}
                            </code>
                        ))}
                    </div>
                </div>
            )}

            {generated.suggestions && generated.suggestions.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                        💡 Tips:
                    </p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                        {generated.suggestions.map((s, i) => (
                            <li key={i}>• {s}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ============================================
// MAIN MODAL
// ============================================

export default function AITemplateGeneratorModal({
    isOpen,
    workspaceId,
    onClose,
    onSave,
}: AITemplateGeneratorModalProps) {
    const STEPS: WizardStep[] = ["type", "context", "purpose", "details", "preview"];

    const [currentStep, setCurrentStep] = useState<WizardStep>("type");
    const [selectedType, setSelectedType] = useState<TemplateType | null>(null);
    const [selectedPurpose, setSelectedPurpose] = useState<TemplatePurpose | null>(null);
    const [selectedTone, setSelectedTone] = useState<TemplateTone | null>(null);
    const [selectedLength, setSelectedLength] = useState<TemplateLength | null>(null);
    const [additionalDetails, setAdditionalDetails] = useState("");

    // New context fields
    const [industry, setIndustry] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [productService, setProductService] = useState("");
    const [callToAction, setCallToAction] = useState("");
    const [painPoints, setPainPoints] = useState("");
    const [uniqueValue, setUniqueValue] = useState("");

    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canProceed = () => {
        switch (currentStep) {
            case "type":
                return selectedType !== null;
            case "context":
                return true; // Context is optional but helpful
            case "purpose":
                return selectedPurpose !== null && selectedTone !== null;
            case "details":
                return selectedLength !== null;
            case "preview":
                return generated !== null;
            default:
                return false;
        }
    };

    const handleNext = async () => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex < STEPS.length - 1) {
            const nextStep = STEPS[currentIndex + 1];
            setCurrentStep(nextStep);

            // Auto-generate when reaching preview step
            if (nextStep === "preview" && !generated) {
                await handleGenerate();
            }
        }
    };

    const handleBack = () => {
        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(STEPS[currentIndex - 1]);
        }
    };

    const handleGenerate = async () => {
        if (!selectedType || !selectedPurpose || !selectedTone || !selectedLength) return;

        setIsGenerating(true);
        setError(null);

        const result = await generateTemplate(workspaceId, {
            templateType: selectedType,
            purpose: selectedPurpose,
            tone: selectedTone,
            length: selectedLength,
            additionalDetails: additionalDetails || undefined,
            industry: industry || undefined,
            targetAudience: targetAudience || undefined,
            companyName: companyName || undefined,
            productService: productService || undefined,
            callToAction: callToAction || undefined,
            painPoints: painPoints || undefined,
            uniqueValue: uniqueValue || undefined,
        });

        setIsGenerating(false);

        if (result.success && result.data) {
            setGenerated(result.data.generated);
        } else {
            setError(result.error || "Failed to generate template");
        }
    };

    const handleSave = () => {
        if (!generated) return;

        onSave({
            name: generated.name,
            subject: generated.subject || "",
            body: generated.body,
            category: selectedPurpose === "welcome" ? "welcome" :
                selectedPurpose === "follow-up" ? "follow-up" :
                    selectedPurpose === "sales-pitch" ? "promotion" : "custom",
        });
        handleClose();
    };

    const handleClose = () => {
        // Reset state
        setCurrentStep("type");
        setSelectedType(null);
        setSelectedPurpose(null);
        setSelectedTone(null);
        setSelectedLength(null);
        setAdditionalDetails("");
        setIndustry("");
        setTargetAudience("");
        setCompanyName("");
        setProductService("");
        setCallToAction("");
        setPainPoints("");
        setUniqueValue("");
        setGenerated(null);
        setError(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/50"
                        onClick={handleClose}
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-xl h-full overflow-auto bg-card border-l border-border shadow-2xl"
                    >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <SparklesIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">
                                    Generate with AI
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Powered by Gemini 2.5 Pro
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="px-6 pt-6">
                        <StepIndicator currentStep={currentStep} steps={STEPS} />
                    </div>

                    {/* Content */}
                    <div className="p-6 min-h-[400px] overflow-y-auto">
                        {currentStep === "type" && (
                            <TypeStep selectedType={selectedType} onSelect={setSelectedType} />
                        )}
                        {currentStep === "context" && (
                            <ContextStep
                                industry={industry}
                                targetAudience={targetAudience}
                                companyName={companyName}
                                productService={productService}
                                onIndustryChange={setIndustry}
                                onAudienceChange={setTargetAudience}
                                onCompanyChange={setCompanyName}
                                onProductChange={setProductService}
                            />
                        )}
                        {currentStep === "purpose" && (
                            <PurposeStep
                                selectedPurpose={selectedPurpose}
                                selectedTone={selectedTone}
                                onSelectPurpose={setSelectedPurpose}
                                onSelectTone={setSelectedTone}
                            />
                        )}
                        {currentStep === "details" && (
                            <DetailsStep
                                selectedLength={selectedLength}
                                additionalDetails={additionalDetails}
                                callToAction={callToAction}
                                painPoints={painPoints}
                                uniqueValue={uniqueValue}
                                selectedPurpose={selectedPurpose}
                                onSelectLength={setSelectedLength}
                                onDetailsChange={setAdditionalDetails}
                                onCtaChange={setCallToAction}
                                onPainPointsChange={setPainPoints}
                                onUniqueValueChange={setUniqueValue}
                            />
                        )}
                        {currentStep === "preview" && (
                            <PreviewStep
                                generated={generated}
                                isLoading={isGenerating}
                                error={error}
                                onRegenerate={handleGenerate}
                            />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-border">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === "type"}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>

                            {currentStep === "preview" ? (
                                <button
                                    onClick={handleSave}
                                    disabled={!generated || isGenerating}
                                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DocumentTextIcon className="w-4 h-4" />
                                    Use Template
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {currentStep === "details" ? (
                                        <>
                                            <SparklesIcon className="w-4 h-4" />
                                            Generate
                                        </>
                                    ) : (
                                        <>
                                            Next
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
