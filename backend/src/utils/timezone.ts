/**
 * Timezone Utility Service
 *
 * Provides timezone-aware date formatting and conversion using dayjs.
 * Ensures consistent timezone handling across the application.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

/**
 * Default timezone (can be overridden per user)
 */
export const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Common timezone options
 */
export const COMMON_TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (AZ)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AK)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
    { value: 'UTC', label: 'UTC (Universal)' },
];

/**
 * Get current date/time in a specific timezone
 */
export function nowInTimezone(tz: string = DEFAULT_TIMEZONE): dayjs.Dayjs {
    return dayjs().tz(tz);
}

/**
 * Convert a date to a specific timezone
 */
export function toTimezone(date: Date | string | dayjs.Dayjs, tz: string = DEFAULT_TIMEZONE): dayjs.Dayjs {
    return dayjs(date).tz(tz);
}

/**
 * Convert a date to UTC
 */
export function toUTC(date: Date | string | dayjs.Dayjs): dayjs.Dayjs {
    return dayjs(date).utc();
}

/**
 * Format a date in a specific timezone
 *
 * @param date - Date to format
 * @param format - dayjs format string (default: 'YYYY-MM-DD HH:mm:ss z')
 * @param tz - Timezone to use (default: DEFAULT_TIMEZONE)
 */
export function formatInTimezone(
    date: Date | string | dayjs.Dayjs,
    format: string = 'YYYY-MM-DD HH:mm:ss z',
    tz: string = DEFAULT_TIMEZONE
): string {
    return dayjs(date).tz(tz).format(format);
}

/**
 * Format a date for display (user-friendly format)
 * Example: "Jan 5, 2026 3:45 PM ET"
 */
export function formatForDisplay(
    date: Date | string | dayjs.Dayjs,
    tz: string = DEFAULT_TIMEZONE
): string {
    return dayjs(date).tz(tz).format('MMM D, YYYY h:mm A z');
}

/**
 * Format a date for display (short format)
 * Example: "1/5/26 3:45 PM"
 */
export function formatShort(
    date: Date | string | dayjs.Dayjs,
    tz: string = DEFAULT_TIMEZONE
): string {
    return dayjs(date).tz(tz).format('M/D/YY h:mm A');
}

/**
 * Format a date relative to now
 * Example: "2 hours ago", "in 3 days"
 */
export function formatRelative(date: Date | string | dayjs.Dayjs): string {
    return dayjs(date).fromNow();
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string | dayjs.Dayjs): boolean {
    return dayjs(date).isBefore(dayjs());
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string | dayjs.Dayjs): boolean {
    return dayjs(date).isAfter(dayjs());
}

/**
 * Check if a date is today (in the specified timezone)
 */
export function isToday(date: Date | string | dayjs.Dayjs, tz: string = DEFAULT_TIMEZONE): boolean {
    const dateInTz = dayjs(date).tz(tz);
    const todayInTz = dayjs().tz(tz);
    return dateInTz.format('YYYY-MM-DD') === todayInTz.format('YYYY-MM-DD');
}

/**
 * Get start of day in a specific timezone
 */
export function startOfDay(date: Date | string | dayjs.Dayjs, tz: string = DEFAULT_TIMEZONE): dayjs.Dayjs {
    return dayjs(date).tz(tz).startOf('day');
}

/**
 * Get end of day in a specific timezone
 */
export function endOfDay(date: Date | string | dayjs.Dayjs, tz: string = DEFAULT_TIMEZONE): dayjs.Dayjs {
    return dayjs(date).tz(tz).endOf('day');
}

/**
 * Get business hours check (9 AM - 5 PM in specified timezone)
 */
export function isBusinessHours(date: Date | string | dayjs.Dayjs, tz: string = DEFAULT_TIMEZONE): boolean {
    const dateInTz = dayjs(date).tz(tz);
    const hour = dateInTz.hour();
    const day = dateInTz.day(); // 0 = Sunday, 6 = Saturday

    // Check if weekday (Monday-Friday) and between 9 AM - 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

/**
 * Add business days to a date (skips weekends)
 */
export function addBusinessDays(
    date: Date | string | dayjs.Dayjs,
    days: number,
    tz: string = DEFAULT_TIMEZONE
): dayjs.Dayjs {
    let current = dayjs(date).tz(tz);
    let remaining = days;

    while (remaining > 0) {
        current = current.add(1, 'day');
        // Skip weekends
        if (current.day() !== 0 && current.day() !== 6) {
            remaining--;
        }
    }

    return current;
}

/**
 * Get next business day
 */
export function nextBusinessDay(date: Date | string | dayjs.Dayjs, tz: string = DEFAULT_TIMEZONE): dayjs.Dayjs {
    let next = dayjs(date).tz(tz).add(1, 'day');

    // Skip to Monday if next day is Saturday or Sunday
    if (next.day() === 0) {
        next = next.add(1, 'day'); // Sunday -> Monday
    } else if (next.day() === 6) {
        next = next.add(2, 'days'); // Saturday -> Monday
    }

    return next;
}

/**
 * Parse a scheduled time string (e.g., "14:30") and combine with a date
 */
export function parseScheduledTime(
    date: Date | string | dayjs.Dayjs,
    timeString: string,
    tz: string = DEFAULT_TIMEZONE
): dayjs.Dayjs {
    const [hours, minutes] = timeString.split(':').map(Number);
    return dayjs(date).tz(tz).hour(hours).minute(minutes).second(0).millisecond(0);
}

/**
 * Get timezone offset string (e.g., "-05:00" for EST)
 */
export function getTimezoneOffset(tz: string = DEFAULT_TIMEZONE): string {
    return dayjs().tz(tz).format('Z');
}

/**
 * Get timezone abbreviation (e.g., "EST", "PST")
 */
export function getTimezoneAbbr(tz: string = DEFAULT_TIMEZONE): string {
    return dayjs().tz(tz).format('z');
}

/**
 * Validate timezone string
 */
export function isValidTimezone(tz: string): boolean {
    try {
        dayjs().tz(tz);
        return true;
    } catch {
        return false;
    }
}

/**
 * Convert schedule window to UTC for database storage
 *
 * @param date - Base date
 * @param startTime - Start time string (e.g., "09:00")
 * @param endTime - End time string (e.g., "17:00")
 * @param tz - User's timezone
 */
export function scheduleWindowToUTC(
    date: Date | string | dayjs.Dayjs,
    startTime: string,
    endTime: string,
    tz: string = DEFAULT_TIMEZONE
): { startUTC: Date; endUTC: Date } {
    const start = parseScheduledTime(date, startTime, tz);
    const end = parseScheduledTime(date, endTime, tz);

    return {
        startUTC: start.utc().toDate(),
        endUTC: end.utc().toDate(),
    };
}

/**
 * Export dayjs instance for advanced usage
 */
export { dayjs };

export default {
    nowInTimezone,
    toTimezone,
    toUTC,
    formatInTimezone,
    formatForDisplay,
    formatShort,
    formatRelative,
    isPast,
    isFuture,
    isToday,
    startOfDay,
    endOfDay,
    isBusinessHours,
    addBusinessDays,
    nextBusinessDay,
    parseScheduledTime,
    getTimezoneOffset,
    getTimezoneAbbr,
    isValidTimezone,
    scheduleWindowToUTC,
    COMMON_TIMEZONES,
    DEFAULT_TIMEZONE,
};
