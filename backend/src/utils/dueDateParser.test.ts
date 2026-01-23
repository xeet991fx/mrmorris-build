/**
 * dueDateParser.test.ts - Story 3.10: Task and Tag Actions
 *
 * Unit tests for due date parsing utility.
 * Task 5.2: Due date parsing (natural language, explicit dates)
 */

import { parseDueDate, ParsedDueDate } from './dueDateParser';

describe('parseDueDate', () => {
  // Helper to get date difference in days
  const daysDiff = (date: Date): number => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  // Helper to get date difference in hours
  const hoursDiff = (date: Date): number => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  describe('natural language patterns', () => {
    it('should parse "in 3 days"', () => {
      const result = parseDueDate('in 3 days');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(3, 0);
    });

    it('should parse "in 1 day"', () => {
      const result = parseDueDate('in 1 day');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });

    it('should parse "3 days" without "in"', () => {
      const result = parseDueDate('3 days');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(3, 0);
    });

    it('should parse "in 5 hours"', () => {
      const result = parseDueDate('in 5 hours');
      expect(result.parseMethod).toBe('natural');
      expect(hoursDiff(result.dueDate)).toBeCloseTo(5, 0);
    });

    it('should parse "in 1 hour"', () => {
      const result = parseDueDate('in 1 hour');
      expect(result.parseMethod).toBe('natural');
      expect(hoursDiff(result.dueDate)).toBeCloseTo(1, 0);
    });

    it('should parse "tomorrow"', () => {
      const result = parseDueDate('tomorrow');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });

    it('should parse "TOMORROW" (case insensitive)', () => {
      const result = parseDueDate('TOMORROW');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });

    it('should parse "next week"', () => {
      const result = parseDueDate('next week');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(7, 0);
    });

    it('should parse "next month"', () => {
      const result = parseDueDate('next month');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(30, 0);
    });
  });

  describe('numeric input (legacy dueIn support)', () => {
    it('should parse numeric 3 as 3 days', () => {
      const result = parseDueDate(3);
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(3, 0);
    });

    it('should parse numeric 1 as 1 day', () => {
      const result = parseDueDate(1);
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });
  });

  describe('explicit date formats', () => {
    it('should parse ISO date format "2026-01-30"', () => {
      const result = parseDueDate('2026-01-30');
      expect(result.parseMethod).toBe('explicit');
      expect(result.dueDate.getFullYear()).toBe(2026);
      expect(result.dueDate.getMonth()).toBe(0); // January
      expect(result.dueDate.getDate()).toBe(30);
    });

    it('should parse month name format "January 30, 2026"', () => {
      const result = parseDueDate('January 30, 2026');
      expect(result.parseMethod).toBe('explicit');
      expect(result.dueDate.getFullYear()).toBe(2026);
      expect(result.dueDate.getMonth()).toBe(0);
      expect(result.dueDate.getDate()).toBe(30);
    });
  });

  describe('default behavior', () => {
    it('should default to 1 day for undefined input', () => {
      const result = parseDueDate(undefined);
      expect(result.parseMethod).toBe('default');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });

    it('should default to 1 day for empty string', () => {
      const result = parseDueDate('');
      expect(result.parseMethod).toBe('default');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });

    it('should default to 1 day for unparseable string', () => {
      const result = parseDueDate('some random text');
      expect(result.parseMethod).toBe('default');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });
  });

  describe('edge cases', () => {
    it('should preserve original input in result', () => {
      const result = parseDueDate('in 3 days');
      expect(result.originalInput).toBe('in 3 days');
    });

    it('should handle leading/trailing whitespace', () => {
      const result = parseDueDate('  tomorrow  ');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(1, 0);
    });

    it('should handle mixed case', () => {
      const result = parseDueDate('In 5 Days');
      expect(result.parseMethod).toBe('natural');
      expect(daysDiff(result.dueDate)).toBeCloseTo(5, 0);
    });
  });
});
