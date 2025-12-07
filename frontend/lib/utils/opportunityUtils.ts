/**
 * Opportunity Utility Functions
 * Helper functions for calculating deal metrics, temperature, etc.
 */

interface StageHistory {
  stageId: string;
  stageName: string;
  enteredAt: string | Date;
  exitedAt?: string | Date;
  duration?: number;
}

interface Opportunity {
  _id: string;
  title: string;
  value: number;
  probability?: number;
  stageHistory?: StageHistory[];
  lastActivityAt?: string | Date;
  activityCount?: number;
  emailCount?: number;
  callCount?: number;
  createdAt: string | Date;
  aiInsights?: {
    dealScore?: number;
  };
}

/**
 * Calculate days in current stage
 */
export function getDaysInStage(opportunity: Opportunity): number {
  if (!opportunity.stageHistory || opportunity.stageHistory.length === 0) {
    return 0;
  }

  // Find the current stage (last entry without exitedAt)
  const currentStageEntry = opportunity.stageHistory.find((h) => !h.exitedAt);

  if (!currentStageEntry) {
    return 0;
  }

  const enteredAt = new Date(currentStageEntry.enteredAt);
  const now = new Date();
  const diffMs = now.getTime() - enteredAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calculate days since last activity
 */
export function getDaysSinceLastActivity(opportunity: Opportunity): number {
  if (!opportunity.lastActivityAt) {
    // If no activity, use creation date
    const createdAt = new Date(opportunity.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  const lastActivity = new Date(opportunity.lastActivityAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calculate deal temperature (hot/warm/cold)
 * Based on activity recency, probability, AI score, and engagement
 */
export function calculateDealTemperature(
  opportunity: Opportunity
): "hot" | "warm" | "cold" {
  const daysSinceActivity = getDaysSinceLastActivity(opportunity);
  const probability = opportunity.probability || 50;
  const daysInStage = getDaysInStage(opportunity);
  const activityCount = opportunity.activityCount || 0;
  const aiDealScore = opportunity.aiInsights?.dealScore || 50;

  // HOT criteria (any of these)
  const isHot =
    daysSinceActivity <= 2 || // Very recent activity
    (probability >= 70 && activityCount >= 5) || // High prob + high activity
    aiDealScore >= 80; // AI is confident

  if (isHot) {
    return "hot";
  }

  // COLD criteria (any of these)
  const isCold =
    daysSinceActivity > 14 || // No activity in 2 weeks
    (probability < 30 && daysInStage > 30) || // Low prob + stuck
    activityCount === 0 || // No activities at all
    aiDealScore < 30; // AI says it's unlikely

  if (isCold) {
    return "cold";
  }

  // Default: WARM
  return "warm";
}

/**
 * Get temperature icon
 */
export function getTemperatureIcon(
  temperature: "hot" | "warm" | "cold"
): string {
  switch (temperature) {
    case "hot":
      return "🔥";
    case "warm":
      return "🌡️";
    case "cold":
      return "❄️";
    default:
      return "🌡️";
  }
}

/**
 * Get temperature color class (Tailwind)
 */
export function getTemperatureColor(
  temperature: "hot" | "warm" | "cold"
): string {
  switch (temperature) {
    case "hot":
      return "text-red-500";
    case "warm":
      return "text-yellow-500";
    case "cold":
      return "text-blue-500";
    default:
      return "text-gray-500";
  }
}

/**
 * Format relative time (e.g., "2h ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 30) {
    return `${diffDays}d ago`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  }
}

/**
 * Format currency value
 */
export function formatCurrency(
  value: number,
  currency: string = "USD",
  compact: boolean = false
): string {
  if (compact && value >= 10000) {
    // Use compact format for large numbers (e.g., $50K instead of $50,000)
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority?: string): string {
  switch (priority) {
    case "high":
      return "text-red-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-blue-500";
    default:
      return "text-gray-500";
  }
}

/**
 * Get priority dot color
 */
export function getPriorityDotColor(priority?: string): string {
  switch (priority) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Calculate weighted pipeline value
 */
export function calculateWeightedValue(
  value: number,
  probability?: number
): number {
  const prob = probability || 50;
  return value * (prob / 100);
}

/**
 * Get avatar initials from name
 */
export function getInitials(name: string): string {
  if (!name) return "?";

  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

/**
 * Get stage aging warning level
 */
export function getStageAgingLevel(
  daysInStage: number
): "normal" | "warning" | "critical" {
  if (daysInStage <= 7) {
    return "normal";
  } else if (daysInStage <= 21) {
    return "warning";
  } else {
    return "critical";
  }
}

/**
 * Get stage aging color
 */
export function getStageAgingColor(daysInStage: number): string {
  const level = getStageAgingLevel(daysInStage);

  switch (level) {
    case "normal":
      return "text-green-600";
    case "warning":
      return "text-yellow-600";
    case "critical":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}
