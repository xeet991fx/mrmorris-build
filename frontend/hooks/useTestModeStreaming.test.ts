/**
 * useTestModeStreaming.test.ts - Story 2.6: Frontend SSE streaming hook tests
 *
 * Tests for:
 * - AC2: Progressive display of steps as they complete
 * - AC3: Progress indicator and cancel functionality
 * - AC1: Loading states during execution
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTestModeStreaming } from './useTestModeStreaming';
import type { TestStepResult, TestProgress, TestStreamResult } from '@/types/agent';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  withCredentials: boolean;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(type: string, data: any) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners.get(type)?.forEach(listener => listener(event));
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  static reset() {
    MockEventSource.instances = [];
  }
}

// Set up global EventSource mock
(global as any).EventSource = MockEventSource;

// Mock fetch for cancel functionality
global.fetch = jest.fn();

describe('useTestModeStreaming', () => {
  const workspaceId = 'workspace123';
  const agentId = 'agent456';

  beforeEach(() => {
    jest.clearAllMocks();
    MockEventSource.reset();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, cancelled: true }),
    });
  });

  // ==========================================================================
  // AC1: Loading States
  // ==========================================================================

  describe('AC1: Loading states', () => {
    it('should start with isRunning false', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      expect(result.current.isRunning).toBe(false);
    });

    it('should set isRunning true when test starts', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      expect(result.current.isRunning).toBe(true);
    });

    it('should set isRunning false when test completes', async () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      // Simulate complete event
      const eventSource = MockEventSource.instances[0];
      act(() => {
        eventSource.dispatchEvent('complete', {
          success: true,
          totalEstimatedCredits: 10,
          totalEstimatedDuration: 5000,
          warnings: [],
        });
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(false);
      });
    });

    it('should track elapsed time during execution', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      // Advance time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.elapsedTimeMs).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should reset state when reset() is called', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.steps).toHaveLength(0);
      expect(result.current.progress).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // ==========================================================================
  // AC2: Progressive Step Display
  // ==========================================================================

  describe('AC2: Progressive step display', () => {
    it('should accumulate steps as they stream in', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];

      const step1: Partial<TestStepResult> = {
        stepNumber: 1,
        action: 'send_email',
        actionLabel: 'Send Email',
        icon: 'email',
        status: 'success',
        preview: { description: 'Sending email to test@test.com' },
        duration: 100,
        estimatedCredits: 2,
        note: 'DRY RUN: No email sent',
        isExpandable: true,
      };

      act(() => {
        eventSource.dispatchEvent('step', step1);
      });

      expect(result.current.steps).toHaveLength(1);
      expect(result.current.steps[0].stepNumber).toBe(1);

      const step2: Partial<TestStepResult> = {
        stepNumber: 2,
        action: 'add_tag',
        actionLabel: 'Add Tag',
        icon: 'tag',
        status: 'success',
        preview: { description: 'Adding tag "contacted"' },
        duration: 50,
        estimatedCredits: 0,
        note: 'DRY RUN: Tag not added',
        isExpandable: false,
      };

      act(() => {
        eventSource.dispatchEvent('step', step2);
      });

      expect(result.current.steps).toHaveLength(2);
    });

    it('should call onStep callback for each step', () => {
      const onStep = jest.fn();
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId, onStep })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];
      const step: Partial<TestStepResult> = {
        stepNumber: 1,
        action: 'add_tag',
        actionLabel: 'Add Tag',
        icon: 'tag',
        status: 'success',
        preview: { description: 'Test' },
        duration: 50,
        estimatedCredits: 0,
        note: 'DRY RUN',
        isExpandable: false,
      };

      act(() => {
        eventSource.dispatchEvent('step', step);
      });

      expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ stepNumber: 1 }));
    });
  });

  // ==========================================================================
  // AC3: Progress Indicator and Cancel
  // ==========================================================================

  describe('AC3: Progress indicator and cancel', () => {
    it('should track progress updates', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];
      const progress: TestProgress = {
        current: 3,
        total: 10,
        executionTimeMs: 500,
      };

      act(() => {
        eventSource.dispatchEvent('progress', progress);
      });

      expect(result.current.progress).toEqual(progress);
      expect(result.current.progress?.current).toBe(3);
      expect(result.current.progress?.total).toBe(10);
    });

    it('should call onProgress callback', () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId, onProgress })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];
      const progress: TestProgress = { current: 5, total: 10 };

      act(() => {
        eventSource.dispatchEvent('progress', progress);
      });

      expect(onProgress).toHaveBeenCalledWith(progress);
    });

    it('should track testRunId from started event', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.dispatchEvent('started', { testRunId: 'test_123_abc' });
      });

      expect(result.current.testRunId).toBe('test_123_abc');
    });

    it('should call cancel API when cancelTest is invoked', async () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.dispatchEvent('started', { testRunId: 'test_123_abc' });
      });

      await act(async () => {
        await result.current.cancelTest();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/workspaces/${workspaceId}/agents/${agentId}/test/test_123_abc`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should close EventSource on cancel', async () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.dispatchEvent('started', { testRunId: 'test_123_abc' });
      });

      await act(async () => {
        await result.current.cancelTest();
      });

      expect(eventSource.readyState).toBe(MockEventSource.CLOSED);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error handling', () => {
    it('should handle error events', () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId, onError })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.dispatchEvent('error', { error: 'Test failed: timeout' });
      });

      expect(result.current.error).toBe('Test failed: timeout');
      expect(result.current.isRunning).toBe(false);
      expect(onError).toHaveBeenCalledWith('Test failed: timeout');
    });

    it('should handle connection errors', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      // Connection loss is indicated by the browser's error handler
      // and readyState changing to CLOSED
    });
  });

  // ==========================================================================
  // Complete Event
  // ==========================================================================

  describe('Complete event', () => {
    it('should store result on complete', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId, onComplete })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];
      const completeData: TestStreamResult = {
        success: true,
        totalEstimatedCredits: 10,
        totalEstimatedDuration: 5000,
        warnings: [],
        executionTimeMs: 4500,
      };

      act(() => {
        eventSource.dispatchEvent('complete', completeData);
      });

      expect(result.current.result).toEqual(completeData);
      expect(onComplete).toHaveBeenCalledWith(completeData);
    });

    it('should include timedOut flag when test times out', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];
      const completeData: TestStreamResult = {
        success: true,
        timedOut: true,
        totalEstimatedCredits: 5,
        totalEstimatedDuration: 30000,
        warnings: [],
        executionTimeMs: 30000,
      };

      act(() => {
        eventSource.dispatchEvent('complete', completeData);
      });

      expect(result.current.result?.timedOut).toBe(true);
    });
  });

  // ==========================================================================
  // URL Construction
  // ==========================================================================

  describe('URL construction', () => {
    it('should build correct URL without targets', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];
      expect(eventSource.url).toContain(`/api/workspaces/${workspaceId}/agents/${agentId}/test/stream`);
    });

    it('should include targetIds in URL when provided', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest(['contact1', 'contact2'], 'contact');
      });

      const eventSource = MockEventSource.instances[0];
      expect(eventSource.url).toContain('targetIds=contact1%2Ccontact2');
      expect(eventSource.url).toContain('targetType=contact');
    });

    it('should use withCredentials option', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];
      expect(eventSource.withCredentials).toBe(true);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('Cleanup', () => {
    it('should close EventSource on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const eventSource = MockEventSource.instances[0];

      unmount();

      expect(eventSource.readyState).toBe(MockEventSource.CLOSED);
    });

    it('should close previous EventSource when starting new test', () => {
      const { result } = renderHook(() =>
        useTestModeStreaming({ agentId, workspaceId })
      );

      act(() => {
        result.current.startTest();
      });

      const firstEventSource = MockEventSource.instances[0];

      act(() => {
        result.current.startTest();
      });

      expect(firstEventSource.readyState).toBe(MockEventSource.CLOSED);
      expect(MockEventSource.instances).toHaveLength(2);
    });
  });
});
