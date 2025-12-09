"use client";

import { useState, useEffect } from "react";

interface LeadScoreEvent {
  eventType: string;
  points: number;
  reason: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface LeadScore {
  _id: string;
  workspaceId: string;
  contactId: string;
  currentScore: number;
  previousScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  previousGrade: "A" | "B" | "C" | "D" | "F";
  scoreHistory: LeadScoreEvent[];
  lastActivityAt: string;
  decayedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface GradeDistribution {
  grade: "A" | "B" | "C" | "D" | "F";
  count: number;
  percentage: number;
}

/**
 * Hook to fetch and manage lead score for a contact
 */
export function useLeadScore(workspaceId: string, contactId: string) {
  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId || !contactId) {
      setLoading(false);
      return;
    }

    const fetchLeadScore = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/workspaces/${workspaceId}/lead-scores/${contactId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            // No score yet, return null
            setLeadScore(null);
          } else {
            throw new Error("Failed to fetch lead score");
          }
        } else {
          const data = await response.json();
          setLeadScore(data.leadScore);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching lead score:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadScore();
  }, [workspaceId, contactId]);

  /**
   * Update the lead score by adding/subtracting points
   */
  const updateScore = async (
    eventType: string,
    points: number,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/lead-scores/${contactId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, points, reason, metadata }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update lead score");
      }

      const data = await response.json();
      setLeadScore(data.leadScore);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Set the lead score to a specific value
   */
  const setScore = async (newScore: number, reason: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/lead-scores/${contactId}/set`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: newScore, reason }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to set lead score");
      }

      const data = await response.json();
      setLeadScore(data.leadScore);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    leadScore,
    loading,
    error,
    updateScore,
    setScore,
    refresh: () => {
      // Trigger a re-fetch by updating a dependency
      setLoading(true);
    },
  };
}

/**
 * Hook to fetch top leads by score
 */
export function useTopLeads(workspaceId: string, limit: number = 10) {
  const [topLeads, setTopLeads] = useState<LeadScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const fetchTopLeads = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/workspaces/${workspaceId}/lead-scores/top?limit=${limit}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch top leads");
        }

        const data = await response.json();
        setTopLeads(data.topLeads);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching top leads:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopLeads();
  }, [workspaceId, limit]);

  return { topLeads, loading, error };
}

/**
 * Hook to fetch lead score distribution
 */
export function useLeadScoreDistribution(workspaceId: string) {
  const [distribution, setDistribution] = useState<GradeDistribution[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const fetchDistribution = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/workspaces/${workspaceId}/lead-scores/distribution`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch lead score distribution");
        }

        const data = await response.json();
        setDistribution(data.distribution);
        setTotalLeads(data.totalLeads);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching distribution:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, [workspaceId]);

  return { distribution, totalLeads, loading, error };
}

/**
 * Hook to apply score decay
 */
export function useScoreDecay(workspaceId: string) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDecay = async (
    daysInactive: number = 30,
    decayPercent: number = 10
  ): Promise<number> => {
    try {
      setApplying(true);
      setError(null);

      const response = await fetch(
        `/api/workspaces/${workspaceId}/lead-scores/decay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ daysInactive, decayPercent }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to apply score decay");
      }

      const data = await response.json();
      return data.decayedCount;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setApplying(false);
    }
  };

  return { applyDecay, applying, error };
}
