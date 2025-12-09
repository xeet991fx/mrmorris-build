"use client";

import React, { useState } from "react";
import { WorkflowStep } from "@/lib/workflow/types";

interface UpdateLeadScoreConfigProps {
  step: WorkflowStep;
  onUpdate: (stepId: string, updates: Partial<WorkflowStep>) => void;
}

// Common scoring events with suggested points
const COMMON_SCORING_EVENTS = [
  { label: "Email Opened", event: "email_opened", points: 5 },
  { label: "Email Clicked", event: "email_clicked", points: 10 },
  { label: "Email Replied", event: "email_replied", points: 15 },
  { label: "Form Submitted", event: "form_submitted", points: 20 },
  { label: "Website Visit", event: "website_visit", points: 5 },
  { label: "Demo Requested", event: "demo_requested", points: 50 },
  { label: "Deal Created", event: "deal_created", points: 50 },
  { label: "Deal Won", event: "deal_won", points: 100 },
  { label: "Meeting Booked", event: "meeting_booked", points: 30 },
  { label: "Content Downloaded", event: "content_downloaded", points: 15 },
  { label: "Custom Event", event: "custom", points: 10 },
];

const NEGATIVE_EVENTS = [
  { label: "Email Bounced", event: "email_bounced", points: -10 },
  { label: "Unsubscribed", event: "email_unsubscribed", points: -50 },
  { label: "Spam Complaint", event: "spam_complaint", points: -100 },
];

export default function UpdateLeadScoreConfig({
  step,
  onUpdate,
}: UpdateLeadScoreConfigProps) {
  const [eventType, setEventType] = useState(
    step.config?.eventType || "custom"
  );
  const [points, setPoints] = useState(step.config?.points || 10);
  const [reason, setReason] = useState(step.config?.reason || "");
  const [usePreset, setUsePreset] = useState(
    COMMON_SCORING_EVENTS.some((e) => e.event === eventType) ||
    NEGATIVE_EVENTS.some((e) => e.event === eventType)
  );

  const handleEventChange = (event: string) => {
    setEventType(event);

    // Auto-fill points and reason based on preset
    const preset =
      COMMON_SCORING_EVENTS.find((e) => e.event === event) ||
      NEGATIVE_EVENTS.find((e) => e.event === event);

    if (preset) {
      setPoints(preset.points);
      setReason(preset.label);
      setUsePreset(true);
    } else {
      setUsePreset(false);
    }

    onUpdate(step.id, {
      config: {
        ...step.config,
        eventType: event,
        points: preset?.points || points,
        reason: preset?.label || reason,
      },
    });
  };

  const handlePointsChange = (value: number) => {
    setPoints(value);
    onUpdate(step.id, {
      config: {
        ...step.config,
        points: value,
      },
    });
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    onUpdate(step.id, {
      config: {
        ...step.config,
        reason: value,
      },
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Update Lead Score
        </h3>
        <p className="text-xs text-gray-600 mb-4">
          Add or subtract points from the contact&apos;s lead score based on their actions.
        </p>
      </div>

      {/* Preset Events */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Scoring Event
        </label>
        <select
          value={eventType}
          onChange={(e) => handleEventChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <optgroup label="Positive Events">
            {COMMON_SCORING_EVENTS.map((event) => (
              <option key={event.event} value={event.event}>
                {event.label} (+{event.points} points)
              </option>
            ))}
          </optgroup>
          <optgroup label="Negative Events">
            {NEGATIVE_EVENTS.map((event) => (
              <option key={event.event} value={event.event}>
                {event.label} ({event.points} points)
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Points */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Points to Add/Subtract
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={points}
            onChange={(e) => handlePointsChange(parseInt(e.target.value) || 0)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="e.g., 10 or -5"
            min="-100"
            max="100"
            step="5"
          />
          <span className="text-sm text-gray-600 min-w-[80px]">
            {points > 0 ? `+${points}` : points} points
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Use positive numbers to add points, negative to subtract.
        </p>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reason (optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => handleReasonChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="e.g., Downloaded whitepaper"
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">
          This will appear in the lead&apos;s score history.
        </p>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-blue-900 mb-1">
          Preview:
        </div>
        <div className="text-sm text-blue-800">
          {points > 0 ? "Add" : "Subtract"}{" "}
          <span className="font-bold">{Math.abs(points)}</span> points{" "}
          {points > 0 ? "to" : "from"} contact&apos;s lead score
          {reason && (
            <>
              {" "}
              for <span className="font-semibold">&quot;{reason}&quot;</span>
            </>
          )}
        </div>
      </div>

      {/* Score Grading Info */}
      <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
        <div className="font-semibold mb-2">Lead Score Grades:</div>
        <div className="grid grid-cols-2 gap-1">
          <div>• A Grade: 80-100 points</div>
          <div>• B Grade: 60-79 points</div>
          <div>• C Grade: 40-59 points</div>
          <div>• D Grade: 20-39 points</div>
          <div>• F Grade: 0-19 points</div>
        </div>
      </div>
    </div>
  );
}
