"use client";

import React from "react";

interface LeadScoreBadgeProps {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

const gradeColors = {
  A: "bg-green-100 text-green-800 border-green-300",
  B: "bg-blue-100 text-blue-800 border-blue-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D: "bg-orange-100 text-orange-800 border-orange-300",
  F: "bg-gray-100 text-gray-800 border-gray-300",
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5",
};

export default function LeadScoreBadge({
  score,
  grade,
  size = "md",
  showScore = true,
}: LeadScoreBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${gradeColors[grade]} ${sizeClasses[size]}`}
      title={`Lead Score: ${score} points`}
    >
      <span className="font-bold">{grade}</span>
      {showScore && (
        <>
          <span className="opacity-50">•</span>
          <span className="font-mono">{score}</span>
        </>
      )}
    </div>
  );
}
