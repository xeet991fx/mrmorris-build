import { useState, useCallback } from 'react';

/**
 * useInstructionHistory Hook
 * Story 4.4, Task 7: Undo functionality for instruction edits
 *
 * Maintains history of last 5 instruction versions for undo capability
 */

interface InstructionHistoryEntry {
  content: string;
  timestamp: number;
}

interface UseInstructionHistoryReturn {
  pushVersion: (content: string) => void;
  undo: () => string | null;
  canUndo: boolean;
  history: InstructionHistoryEntry[];
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 5;

export function useInstructionHistory(
  initialContent?: string
): UseInstructionHistoryReturn {
  const [history, setHistory] = useState<InstructionHistoryEntry[]>(() => {
    if (initialContent) {
      return [{ content: initialContent, timestamp: Date.now() }];
    }
    return [];
  });

  /**
   * Store new instruction version in history (Task 7.2, 7.3)
   * Keeps only last 5 versions
   */
  const pushVersion = useCallback((content: string) => {
    setHistory((prev) => {
      const newEntry: InstructionHistoryEntry = {
        content,
        timestamp: Date.now(),
      };

      // Add new version and limit to MAX_HISTORY_SIZE
      const updated = [...prev, newEntry];
      if (updated.length > MAX_HISTORY_SIZE) {
        return updated.slice(-MAX_HISTORY_SIZE);
      }
      return updated;
    });
  }, []);

  /**
   * Restore previous version from history (Task 7.5)
   * Returns the previous content or null if no history
   */
  const undo = useCallback((): string | null => {
    if (history.length <= 1) {
      return null; // Can't undo if only one or zero versions
    }

    // Get the second-to-last version (before current)
    const previousVersion = history[history.length - 2];

    // Remove current version from history
    setHistory((prev) => prev.slice(0, -1));

    return previousVersion.content;
  }, [history]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const canUndo = history.length > 1;

  return {
    pushVersion,
    undo,
    canUndo,
    history,
    clearHistory,
  };
}
