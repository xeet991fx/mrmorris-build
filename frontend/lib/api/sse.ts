/**
 * SSE (Server-Sent Events) Client Utility for AI Copilot Streaming
 *
 * Handles real-time streaming of AI responses from the backend using EventSource API.
 * Supports token-by-token streaming with automatic reconnection and error handling.
 */

interface SSEMessage {
  token?: string;
  done?: boolean;
  error?: string;
}

// API base URL - use environment variable or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StreamOptions {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Stream AI Copilot response using Server-Sent Events
 *
 * @param workspaceId - Workspace ID
 * @param agentId - Agent ID
 * @param message - User message to send
 * @param options - Streaming callbacks and configuration
 * @returns Cleanup function to close the connection
 */
export function streamCopilotResponse(
  workspaceId: string,
  agentId: string,
  message: string,
  options: StreamOptions
): () => void {
  const {
    onToken,
    onComplete,
    onError,
    maxRetries = 3,
    timeout = 30000
  } = options;

  let retryCount = 0;
  let abortController: AbortController | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let isClosed = false;

  const connect = async () => {
    if (isClosed) return;

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        onError('Authentication token not found');
        return;
      }

      // Create AbortController for cancellation
      abortController = new AbortController();

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        onError('Request timeout - please try again');
      }, timeout);

      // Use fetch() with POST to send message (EventSource can't POST)
      const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/agents/${agentId}/copilot/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Read SSE stream manually
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          cleanup();
          onComplete();
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (terminated by \n\n)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          // Parse SSE format: "data: {...}"
          const match = line.match(/^data: (.+)$/);
          if (match) {
            try {
              const data: SSEMessage = JSON.parse(match[1]);

              if (data.token) {
                // Token received - append to message
                onToken(data.token);
              } else if (data.done) {
                // Stream complete
                cleanup();
                onComplete();
                return;
              } else if (data.error) {
                // Error from server
                cleanup();
                onError(data.error);
                return;
              }
            } catch (err) {
              console.error('Failed to parse SSE message:', err);
            }
          }
        }
      }

    } catch (err: any) {
      // Check if error is due to abort
      if (err.name === 'AbortError' || isClosed) {
        return;
      }

      console.error('Streaming error:', err);

      // Retry with exponential backoff
      if (retryCount < maxRetries && !isClosed) {
        retryCount++;
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);

        console.warn(`Retrying connection (${retryCount}/${maxRetries}) in ${backoffDelay}ms`);

        setTimeout(() => {
          connect();
        }, backoffDelay);
      } else if (!isClosed) {
        cleanup();
        onError(err.message || 'Connection failed - please try again');
      }
    }
  };

  const cleanup = () => {
    isClosed = true;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };

  // Start connection
  connect();

  // Return cleanup function
  return cleanup;
}

/**
 * Hook-friendly async streaming function
 * Returns an async generator that yields tokens
 */
export async function* streamCopilotResponseAsync(
  workspaceId: string,
  agentId: string,
  message: string
): AsyncGenerator<string, void, unknown> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const response = await fetch(
    `${API_BASE_URL}/workspaces/${workspaceId}/agents/${agentId}/copilot/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const match = line.match(/^data: (.+)$/);
        if (match) {
          const data: SSEMessage = JSON.parse(match[1]);

          if (data.token) {
            yield data.token;
          } else if (data.done) {
            return;
          } else if (data.error) {
            throw new Error(data.error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
