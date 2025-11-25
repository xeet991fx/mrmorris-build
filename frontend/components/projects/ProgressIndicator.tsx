import { motion } from "framer-motion";
import { CheckIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Business" },
  { number: 2, label: "Goals" },
  { number: 3, label: "Channels" },
  { number: 4, label: "Brand" },
  { number: 5, label: "Offer" },
  { number: 6, label: "Competition" },
  { number: 7, label: "Advanced" },
];

interface ProgressIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

export default function ProgressIndicator({
  currentStep,
  completedSteps,
}: ProgressIndicatorProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto px-4">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-[#9ACD32] border-[#9ACD32]"
                      : isCurrent
                      ? "bg-[#9ACD32] border-[#9ACD32]"
                      : "bg-neutral-700 border-neutral-600"
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckIcon className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isCurrent ? "text-neutral-900" : "text-neutral-400"
                      )}
                    >
                      {step.number}
                    </span>
                  )}
                </div>

                {/* Circular Ripple for Current Step */}
                {isCurrent && (
                  <div className="absolute top-0 left-0 w-10 h-10 rounded-full pulse-ring pointer-events-none" />
                )}

                {/* Step Label */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center",
                    isCurrent
                      ? "text-[#9ACD32]"
                      : isCompleted
                      ? "text-[#9ACD32]"
                      : "text-neutral-400"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 relative -top-4">
                  <div className="absolute inset-0 bg-neutral-600" />
                  <motion.div
                    className="absolute inset-0 bg-[#9ACD32]"
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: isCompleted ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
