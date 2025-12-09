"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";

interface LeadScoreEvent {
  eventType: string;
  points: number;
  reason: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface LeadScoreHistoryProps {
  events: LeadScoreEvent[];
  currentScore: number;
}

export default function LeadScoreHistory({
  events,
  currentScore,
}: LeadScoreHistoryProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No scoring activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b">
        <h3 className="text-sm font-semibold text-gray-700">Score History</h3>
        <span className="text-xs text-gray-500">
          Current Score: <span className="font-bold text-gray-900">{currentScore}</span>
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.map((event, index) => {
          const isPositive = event.points > 0;
          const isNegative = event.points < 0;

          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {/* Point Change Indicator */}
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                  isPositive
                    ? "bg-green-100 text-green-700"
                    : isNegative
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {isPositive && "+"}
                {event.points}
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {event.reason}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {event.eventType.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(event.timestamp), {
                    addSuffix: true,
                  })}
                </p>

                {/* Metadata (if any) */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                      View details
                    </summary>
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
