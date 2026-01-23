/**
 * dueDateParser.ts - Story 3.10: Task and Tag Actions
 *
 * Parse due date from natural language or explicit format.
 * AC1: Support natural language patterns for task creation.
 *
 * Supported patterns:
 * - "in X days" / "in X day"
 * - "in X hours" / "in X hour"
 * - "tomorrow"
 * - "next week" (7 days)
 * - "next month" (30 days)
 * - Explicit: "2026-01-30", "January 30, 2026"
 *
 * Returns Date object with default 1 day if unparseable
 */

export interface ParsedDueDate {
  dueDate: Date;
  originalInput: string;
  parseMethod: 'natural' | 'explicit' | 'default';
}

/**
 * Parse due date from natural language or explicit format
 */
export function parseDueDate(input: string | number | undefined): ParsedDueDate {
  const now = new Date();

  // Handle undefined or empty input - default to 1 day
  if (input === undefined || input === null || input === '') {
    const defaultDate = new Date(now);
    defaultDate.setDate(defaultDate.getDate() + 1);
    return { dueDate: defaultDate, originalInput: '', parseMethod: 'default' };
  }

  // Handle numeric input (legacy dueIn days support)
  if (typeof input === 'number') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + input);
    return { dueDate, originalInput: String(input), parseMethod: 'natural' };
  }

  const lowerInput = input.toLowerCase().trim();

  // Pattern: "in X days" or "X days"
  const daysMatch = lowerInput.match(/(?:in\s+)?(\d+)\s+days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + days);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "in X hours" or "X hours"
  const hoursMatch = lowerInput.match(/(?:in\s+)?(\d+)\s+hours?/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    const dueDate = new Date(now);
    dueDate.setHours(dueDate.getHours() + hours);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "tomorrow"
  if (lowerInput === 'tomorrow') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 1);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "next week"
  if (lowerInput === 'next week') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "next month"
  if (lowerInput === 'next month') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Try explicit date parsing
  const explicitDate = new Date(input);
  if (!isNaN(explicitDate.getTime())) {
    return { dueDate: explicitDate, originalInput: input, parseMethod: 'explicit' };
  }

  // Default: 1 day from now
  const defaultDate = new Date(now);
  defaultDate.setDate(defaultDate.getDate() + 1);
  return { dueDate: defaultDate, originalInput: input, parseMethod: 'default' };
}

export default parseDueDate;
