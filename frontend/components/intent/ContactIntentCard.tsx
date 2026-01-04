"use client";

import { useEffect, useState, useCallback } from "react";

interface IntentBreakdown {
  totalScore: number;
  signalsByType: Record<string, number>;
  recentSignals: {
    name: string;
    description: string;
    score: number;
    timestamp: string;
    url?: string;
  }[];
  patterns: string[];
  timeline: {
    date: string;
    score: number;
  }[];
}

interface Props {
  workspaceId: string;
  contactId: string;
}

export default function ContactIntentCard({ workspaceId, contactId }: Props) {
  const [breakdown, setBreakdown] = useState<IntentBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchIntentBreakdown = useCallback(async () => {
    if (!workspaceId || !contactId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/workspaces/${workspaceId}/intent/contacts/${contactId}?days=${days}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch intent breakdown");
      }

      const data = await response.json();
      setBreakdown(data.data);
    } catch (err: any) {
      console.error("Error fetching intent breakdown:", err);
      setError(err.message || "Failed to load intent data");
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, contactId, days]);

  useEffect(() => {
    fetchIntentBreakdown();
  }, [fetchIntentBreakdown]);

  const getScoreLevel = (score: number) => {
    if (score >= 200) return { label: "Very High Intent", color: "red", emoji: "🔥", bg: "bg-red-50", text: "text-red-700" };
    if (score >= 150) return { label: "High Intent", color: "orange", emoji: "⭐", bg: "bg-orange-50", text: "text-orange-700" };
    if (score >= 100) return { label: "Medium Intent", color: "yellow", emoji: "✅", bg: "bg-yellow-50", text: "text-yellow-700" };
    if (score >= 50) return { label: "Low Intent", color: "green", emoji: "👍", bg: "bg-green-50", text: "text-green-700" };
    return { label: "No Intent", color: "gray", emoji: "💡", bg: "bg-gray-50", text: "text-gray-700" };
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getPatternInfo = (pattern: string) => {
    const patterns: Record<string, { icon: string; label: string; description: string }> = {
      demo_seeker: { icon: "🎯", label: "Demo Seeker", description: "Actively seeking demo" },
      comparison_shopper: { icon: "🔍", label: "Comparison Shopper", description: "Comparing vendors" },
      ready_to_buy: { icon: "💰", label: "Ready to Buy", description: "Strong buying intent" },
      technical_evaluator: { icon: "⚙️", label: "Technical Evaluator", description: "Reviewing technical details" },
      content_consumer: { icon: "📚", label: "Content Consumer", description: "Researching solution" },
    };
    return patterns[pattern] || { icon: "📊", label: pattern, description: "Custom pattern" };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-sm text-gray-600">Loading intent data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Intent Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchIntentBreakdown}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!breakdown) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-gray-600">No intent data available</p>
        </div>
      </div>
    );
  }

  const scoreLevel = getScoreLevel(breakdown.totalScore);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Buying Intent Score</h3>
            <p className="text-sm text-gray-600 mt-1">Based on behavioral signals</p>
          </div>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="block pl-3 pr-10 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Score Display */}
      <div className={`px-6 py-8 border-b border-gray-200 ${scoreLevel.bg}`}>
        <div className="text-center">
          <div className="text-7xl mb-3">{scoreLevel.emoji}</div>
          <div className={`text-5xl font-bold ${scoreLevel.text} mb-2`}>
            {breakdown.totalScore}
          </div>
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white shadow-sm">
            <span className="text-sm font-medium text-gray-700">{scoreLevel.label}</span>
          </div>
        </div>
      </div>

      {/* Detected Patterns */}
      {breakdown.patterns && breakdown.patterns.length > 0 && (
        <div className="px-6 py-5 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Detected Patterns
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {breakdown.patterns.map((pattern, idx) => {
              const patternInfo = getPatternInfo(pattern);
              return (
                <div
                  key={idx}
                  className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <span className="text-2xl mr-3">{patternInfo.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">{patternInfo.label}</div>
                    <div className="text-sm text-blue-700">{patternInfo.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Signals */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="h-5 w-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Recent Activity
        </h4>
        {breakdown.recentSignals && breakdown.recentSignals.length > 0 ? (
          <div className="space-y-3">
            {breakdown.recentSignals.map((signal, idx) => (
              <div
                key={idx}
                className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      {signal.description}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                      +{signal.score}
                    </span>
                  </div>
                  {signal.url && (
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {signal.url}
                    </div>
                  )}
                </div>
                <div className="ml-3 flex-shrink-0 text-xs text-gray-500 whitespace-nowrap">
                  {formatTimestamp(signal.timestamp)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No recent activity</p>
          </div>
        )}
      </div>

      {/* Signals by Type */}
      <div className="px-6 py-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Signals by Type
        </h4>
        {breakdown.signalsByType && Object.keys(breakdown.signalsByType).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(breakdown.signalsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, score]) => {
                const percentage =
                  breakdown.totalScore > 0
                    ? Math.min(100, (score / breakdown.totalScore) * 100)
                    : 0;

                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {type.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{score} pts</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No signals recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
