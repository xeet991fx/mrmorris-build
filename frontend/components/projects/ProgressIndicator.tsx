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
    <div className="w-full py-8">
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
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-green-500 border-green-500"
                      : isCurrent
                      ? "bg-gradient-to-br from-violet-500 to-purple-500 border-violet-500"
                      : "bg-slate-800 border-slate-700"
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckIcon className="w-6 h-6 text-white" />
                    </motion.div>
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-bold",
                        isCurrent ? "text-white" : "text-slate-500"
                      )}
                    >
                      {step.number}
                    </span>
                  )}
                </div>

                {/* Pulsing Ring for Current Step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-violet-500"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}

                {/* Step Label */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center",
                    isCurrent
                      ? "text-white"
                      : isCompleted
                      ? "text-green-400"
                      : "text-slate-500"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 relative -top-4">
                  <div className="absolute inset-0 bg-slate-700" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500"
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: isCompleted ? 1 : 0,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
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
