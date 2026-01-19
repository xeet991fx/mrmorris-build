/**
 * Story 1.11: Date utility functions
 */

/**
 * Format a date string as relative time (e.g., "5m ago", "2h ago", "3d ago")
 * @param dateString - ISO 8601 date string or null/undefined
 * @returns Formatted relative time string
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);

  // Handle invalid dates
  if (isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Handle future dates
  if (diffInSeconds < 0) return 'Just now';

  // Less than a minute
  if (diffInSeconds < 60) return 'Just now';

  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }

  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }

  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }

  // More than a week - show localized date
  return date.toLocaleDateString();
}

/**
 * Format a date string as a full date and time
 * @param dateString - ISO 8601 date string
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString();
}

/**
 * Format a date string as a date only (no time)
 * @param dateString - ISO 8601 date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleDateString();
}
