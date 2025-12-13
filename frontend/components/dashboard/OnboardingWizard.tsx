"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    SparklesIcon,
    EnvelopeIcon,
    UserGroupIcon,
    RocketLaunchIcon,
    CheckCircleIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

interface Step {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    cta: string;
    href: string;
    isComplete: boolean;
}

export function OnboardingWizard() {
    const [isOpen, setIsOpen] = useState(true);
    const router = useRouter();
    const { currentWorkspace } = useWorkspaceStore();

    if (!currentWorkspace || !isOpen) return null;

    // Mock checking for completion - in a real app this would check store/api
    // For now we just show the wizard to guide them
    const steps: Step[] = [
        {
            id: "email",
            title: "Connect Email",
            description: "Connect your sending accounts to start outreach.",
            icon: EnvelopeIcon,
            cta: "Connect",
            href: `/projects/${currentWorkspace._id}/email-accounts?onboarding=true`,
            isComplete: false,
        },
        {
            id: "contacts",
            title: "Import Contacts",
            description: "Add your leads or import them from CSV.",
            icon: UserGroupIcon,
            cta: "Import",
            href: `/projects/${currentWorkspace._id}/contacts?onboarding=true`,
            isComplete: false,
        },
        {
            id: "campaign",
            title: "Launch Campaign",
            description: "Create your first sequence and start sending.",
            icon: RocketLaunchIcon,
            cta: "Create",
            href: `/projects/${currentWorkspace._id}/campaigns?new=true`,
            isComplete: false,
        },
    ];

    const handleStepClick = (href: string) => {
        setIsOpen(false);
        router.push(href);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className="fixed bottom-6 right-6 z-40 w-full max-w-sm bg-card border border-border shadow-2xl rounded-xl overflow-hidden ring-1 ring-primary/10"
                >
                    {/* Header */}
                    <div className="bg-primary/5 p-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                                <SparklesIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-foreground">Getting Started</h3>
                                <p className="text-xs text-muted-foreground">0 → First Campaign in 5 mins</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-muted-foreground hover:text-foreground text-xs font-medium px-2 py-1 hover:bg-muted/50 rounded"
                        >
                            Close
                        </button>
                    </div>

                    {/* Steps */}
                    <div className="p-2 space-y-1">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                onClick={() => handleStepClick(step.href)}
                                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50"
                            >
                                <div className={`p-2 rounded-md ${step.isComplete ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground group-hover:bg-background group-hover:text-primary'
                                    }`}>
                                    {step.isComplete ? (
                                        <CheckCircleIcon className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                        {step.title}
                                        {index === 0 && !step.isComplete && (
                                            <span className="inline-block w-2 H-2 rounded-full bg-primary animate-pulse" />
                                        )}
                                    </h4>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                        {step.description}
                                    </p>
                                </div>

                                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                                    <ArrowRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
                    <div className="p-3 bg-muted/30 border-t border-border mt-1">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground font-medium">Progress</span>
                            <span className="text-foreground font-semibold">0%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[0%] rounded-full" />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
