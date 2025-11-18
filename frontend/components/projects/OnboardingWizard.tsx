"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useProjectStore } from "@/store/useProjectStore";
import type { Project, OnboardingData } from "@/lib/api/project";
import ProgressIndicator from "./ProgressIndicator";
import toast from "react-hot-toast";

// Import step components
import Step1BusinessOverview from "./wizard/Step1BusinessOverview";
import Step2GoalsMetrics from "./wizard/Step2GoalsMetrics";
import Step3ChannelsSetup from "./wizard/Step3ChannelsSetup";
import Step4BrandMessaging from "./wizard/Step4BrandMessaging";
import Step5OfferCTA from "./wizard/Step5OfferCTA";
import Step6Competition from "./wizard/Step6Competition";
import Step7Advanced from "./wizard/Step7Advanced";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export default function OnboardingWizard({ isOpen, onClose, project }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [formData, setFormData] = useState<OnboardingData>(project.onboardingData || {});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { saveOnboarding, isLoading } = useProjectStore();

  // Debug: Log component mount and unmount
  useEffect(() => {
    console.log("🎬 OnboardingWizard mounted");
    return () => {
      console.log("💥 OnboardingWizard unmounting");
    };
  }, []);

  // Debug: Log whenever currentStep changes
  useEffect(() => {
    console.log("🔥 currentStep changed to:", currentStep);
  }, [currentStep]);

  // Initialize completed steps and form data ONLY when wizard opens
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset flag when wizard closes so it reinitializes on next open
      initializedRef.current = false;
      return;
    }

    // Only initialize once when wizard opens
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log("🚀 Initializing wizard with project data");

    if (project.onboardingData) {
      const completed: number[] = [];

      // Helper function to check if section has meaningful data
      const hasData = (section: any) => {
        if (!section || typeof section !== 'object') return false;
        const keys = Object.keys(section);
        return keys.length > 0 && keys.some(key => {
          const value = section[key];
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'object' && value !== null) {
            return Object.keys(value).length > 0;
          }
          return value !== undefined && value !== null && value !== '';
        });
      };

      if (hasData(project.onboardingData.business)) completed.push(1);
      if (hasData(project.onboardingData.goals)) completed.push(2);
      if (hasData(project.onboardingData.channels)) completed.push(3);
      if (hasData(project.onboardingData.brand)) completed.push(4);
      if (hasData(project.onboardingData.offer)) completed.push(5);
      if (hasData(project.onboardingData.competition)) completed.push(6);
      if (hasData(project.onboardingData.advanced)) completed.push(7);

      setCompletedSteps(completed);
      setFormData(project.onboardingData);
    }
  }, [isOpen, project.onboardingData]); // Initialize on open, but use ref to prevent re-init

  const handleNext = async (stepData: any, isValid: boolean = true) => {
    console.log("🚀 handleNext called with:", { stepData, isValid, currentStep });

    if (!isValid) {
      console.log("⚠️ Validation failed, stopping here");
      return;
    }

    // Update form data
    const updatedData = { ...formData, ...stepData };
    console.log("📝 Updated form data:", updatedData);
    setFormData(updatedData);

    // Mark step as completed
    if (!completedSteps.includes(currentStep)) {
      console.log("✔️ Marking step", currentStep, "as completed");
      setCompletedSteps([...completedSteps, currentStep]);
    }

    // Save draft
    console.log("💾 Attempting to save draft...");
    try {
      await saveOnboarding(project._id, updatedData, currentStep);
      console.log("✅ Draft saved successfully");
      // Optional: show success toast
      // toast.success("Draft saved");
    } catch (error) {
      console.error("❌ Failed to save draft:", error);
      toast.error("Failed to save draft. Please try again.");
      // Don't navigate if save failed
      return;
    }

    // Move to next step or complete
    if (currentStep < 7) {
      console.log("➡️ Moving to next step:", currentStep + 1);
      setDirection("forward");
      setCurrentStep(prev => {
        console.log("🔄 Updating step from", prev, "to", prev + 1);
        return prev + 1;
      });
    } else {
      console.log("🏁 Reached final step");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection("backward");
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async (finalStepData: any) => {
    const updatedData = { ...formData, ...finalStepData };
    setFormData(updatedData);

    try {
      // Pass complete=true to mark onboarding as complete
      await saveOnboarding(project._id, updatedData, 7, true);
      toast.success("Project setup completed successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to complete setup. Please try again.");
    }
  };

  const handleClose = () => {
    // Only show confirmation if user has actually entered data
    const hasEnteredData = Object.values(formData).some(section => {
      if (!section || typeof section !== 'object') return false;
      const keys = Object.keys(section);
      return keys.length > 0 && keys.some(key => {
        const value = section[key as keyof typeof section];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
      });
    });

    if (currentStep > 1 || hasEnteredData) {
      if (confirm("Your progress has been saved. Are you sure you want to exit?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const slideVariants = {
    enter: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? -1000 : 1000,
      opacity: 0,
    }),
  };

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl bg-neutral-800/95 backdrop-blur-xl border border-neutral-700/50 rounded-xl shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-neutral-700/50">
                  <Dialog.Title className="text-xl font-semibold text-white">
                    Project Setup
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Indicator */}
                <ProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />

                {/* Content Area with Step Transitions */}
                <div className="relative overflow-hidden min-h-[400px]">
                  <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                      key={currentStep}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                      className="p-6"
                    >
                      {currentStep === 1 && (
                        <Step1BusinessOverview
                          data={formData.business}
                          onNext={(data) => handleNext({ business: data })}
                          onBack={handleBack}
                        />
                      )}
                      {currentStep === 2 && (
                        <Step2GoalsMetrics
                          data={formData.goals}
                          onNext={(data) => handleNext({ goals: data })}
                          onBack={handleBack}
                        />
                      )}
                      {currentStep === 3 && (
                        <Step3ChannelsSetup
                          data={formData.channels}
                          onNext={(data) => handleNext({ channels: data })}
                          onBack={handleBack}
                        />
                      )}
                      {currentStep === 4 && (
                        <Step4BrandMessaging
                          data={formData.brand}
                          onNext={(data) => handleNext({ brand: data })}
                          onBack={handleBack}
                        />
                      )}
                      {currentStep === 5 && (
                        <Step5OfferCTA
                          data={formData.offer}
                          onNext={(data) => handleNext({ offer: data })}
                          onBack={handleBack}
                        />
                      )}
                      {currentStep === 6 && (
                        <Step6Competition
                          data={formData.competition}
                          onNext={(data) => handleNext({ competition: data })}
                          onBack={handleBack}
                        />
                      )}
                      {currentStep === 7 && (
                        <Step7Advanced
                          data={formData.advanced}
                          onComplete={(data) => handleComplete({ advanced: data })}
                          onBack={handleBack}
                          isLoading={isLoading}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer with Draft Save Notice */}
                <div className="p-5 border-t border-neutral-700/50 bg-neutral-800/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">
                      Your progress is automatically saved as you go
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>Step {currentStep} of 7</span>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
