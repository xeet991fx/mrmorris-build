"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    SparklesIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    PhotoIcon,
    DocumentTextIcon,
    CheckIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
    generateTemplate,
    fileToBase64,
    TEMPLATE_TYPES,
    TEMPLATE_PURPOSES,
    TEMPLATE_TONES,
    TEMPLATE_LENGTHS,
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

type WizardStep = "type" | "purpose" | "details" | "preview";

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATE_TYPES.map((type) => (
                    <button
                        key={type.value}
                        onClick={() => onSelect(type.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all hover:border-primary ${selectedType === type.value
                                ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                : "border-border hover:bg-muted/50"
                            }`}
                    >
                        <span className="text-2xl mb-2 block">{type.icon}</span>
                        <span className="font-medium text-foreground">{type.label}</span>
                        <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </button>
                ))}
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
                <div className="flex flex-wrap gap-2">
                    {TEMPLATE_TONES.map((tone) => (
                        <button
                            key={tone.value}
                            onClick={() => onSelectTone(tone.value)}
                            className={`px-4 py-2 rounded-full border transition-all ${selectedTone === tone.value
                                    ? "border-[#9ACD32] bg-[#9ACD32]/10 text-foreground"
                                    : "border-border text-muted-foreground hover:bg-muted/50"
                                }`}
                        >
                            <span className="mr-1">{tone.emoji}</span>
                            {tone.label}
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
    sampleImage,
    onSelectLength,
    onDetailsChange,
    onImageUpload,
    onImageRemove,
}: {
    selectedLength: TemplateLength | null;
    additionalDetails: string;
    sampleImage: string | null;
    onSelectLength: (length: TemplateLength) => void;
    onDetailsChange: (details: string) => void;
    onImageUpload: (file: File) => void;
    onImageRemove: () => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6">
            {/* Length */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">How long?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select the desired length</p>
                <div className="flex gap-3">
                    {TEMPLATE_LENGTHS.map((length) => (
                        <button
                            key={length.value}
                            onClick={() => onSelectLength(length.value)}
                            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${selectedLength === length.value
                                    ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                    : "border-border hover:bg-muted/50"
                                }`}
                        >
                            <span className="font-medium text-foreground">{length.label}</span>
                            <p className="text-xs text-muted-foreground mt-1">{length.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Additional Details */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Additional details</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Add any specific instructions or context (optional)
                </p>
                <textarea
                    value={additionalDetails}
                    onChange={(e) => onDetailsChange(e.target.value)}
                    placeholder="E.g., Include a discount code, mention our new product launch, target tech startups..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
            </div>

            {/* Sample Image Upload */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    Sample screenshot <span className="text-muted-foreground font-normal">(optional)</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Upload a screenshot of a template style you like for reference
                </p>

                {sampleImage ? (
                    <div className="relative rounded-xl border border-border overflow-hidden">
                        <img
                            src={sampleImage}
                            alt="Sample"
                            className="w-full max-h-48 object-contain bg-muted/30"
                        />
                        <button
                            onClick={onImageRemove}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/90 text-red-500 hover:bg-background transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-muted/30 transition-all"
                    >
                        <PhotoIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImageUpload(file);
                    }}
                />
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
    const STEPS: WizardStep[] = ["type", "purpose", "details", "preview"];

    const [currentStep, setCurrentStep] = useState<WizardStep>("type");
    const [selectedType, setSelectedType] = useState<TemplateType | null>(null);
    const [selectedPurpose, setSelectedPurpose] = useState<TemplatePurpose | null>(null);
    const [selectedTone, setSelectedTone] = useState<TemplateTone | null>(null);
    const [selectedLength, setSelectedLength] = useState<TemplateLength | null>(null);
    const [additionalDetails, setAdditionalDetails] = useState("");
    const [sampleImage, setSampleImage] = useState<string | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canProceed = () => {
        switch (currentStep) {
            case "type":
                return selectedType !== null;
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
            sampleImage: sampleImage || undefined,
        });

        setIsGenerating(false);

        if (result.success && result.data) {
            setGenerated(result.data.generated);
        } else {
            setError(result.error || "Failed to generate template");
        }
    };

    const handleImageUpload = async (file: File) => {
        try {
            const base64 = await fileToBase64(file);
            setSampleImage(base64);
        } catch (err) {
            console.error("Failed to read image:", err);
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
        setSampleImage(null);
        setGenerated(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-card border border-border rounded-2xl shadow-2xl mx-4"
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
                    <div className="p-6 min-h-[400px]">
                        {currentStep === "type" && (
                            <TypeStep selectedType={selectedType} onSelect={setSelectedType} />
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
                                sampleImage={sampleImage}
                                onSelectLength={setSelectedLength}
                                onDetailsChange={setAdditionalDetails}
                                onImageUpload={handleImageUpload}
                                onImageRemove={() => setSampleImage(null)}
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
            </AnimatePresence>
        </div>
    );
}
