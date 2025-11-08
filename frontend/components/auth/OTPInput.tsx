"use client";

import { useRef, useState, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";
import { motion } from "framer-motion";

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled = false }: OTPInputProps) {
  const [otp, setOTP] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    // Only allow digits
    const sanitizedValue = value.replace(/[^0-9]/g, "");

    if (sanitizedValue.length > 1) {
      // Handle paste or multiple characters
      const digits = sanitizedValue.slice(0, length).split("");
      const newOTP = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < length) {
          newOTP[index + i] = digit;
        }
      });
      setOTP(newOTP);

      // Focus on the next empty input or the last one
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();

      // Check if complete
      if (newOTP.every((digit) => digit !== "")) {
        onComplete(newOTP.join(""));
      }
      return;
    }

    // Handle single character
    const newOTP = [...otp];
    newOTP[index] = sanitizedValue;
    setOTP(newOTP);

    // Auto-focus next input
    if (sanitizedValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOTP.every((digit) => digit !== "")) {
      onComplete(newOTP.join(""));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();

      if (otp[index]) {
        // Clear current input
        const newOTP = [...otp];
        newOTP[index] = "";
        setOTP(newOTP);
      } else if (index > 0) {
        // Move to previous input and clear it
        const newOTP = [...otp];
        newOTP[index - 1] = "";
        setOTP(newOTP);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");
    const digits = pastedData.replace(/[^0-9]/g, "").slice(0, length).split("");

    const newOTP = [...otp];
    digits.forEach((digit, index) => {
      if (index < length) {
        newOTP[index] = digit;
      }
    });
    setOTP(newOTP);

    // Focus on the next empty input or the last one
    const nextIndex = Math.min(digits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    // Check if complete
    if (newOTP.every((digit) => digit !== "")) {
      onComplete(newOTP.join(""));
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
        >
          <input
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleChange(index, e.target.value)
            }
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`
              w-12 h-14 sm:w-14 sm:h-16
              text-center text-2xl font-bold
              bg-slate-800/50
              border-2
              ${digit ? "border-violet-500" : "border-slate-700/50"}
              rounded-lg
              text-white
              focus:border-violet-500
              focus:ring-2
              focus:ring-violet-500/20
              focus:outline-none
              transition-all
              disabled:opacity-50
              disabled:cursor-not-allowed
              hover:border-violet-500/50
            `}
            aria-label={`Digit ${index + 1}`}
          />
        </motion.div>
      ))}
    </div>
  );
}
