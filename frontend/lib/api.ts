import type { ExecutionRequest, ExecutionResponse, JvmSnapshot } from '@/types/jvm';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export const api = {
  /**
   * Submits Java code for execution.
   * Returns a sessionId to subscribe to for WebSocket events.
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
    const res = await fetch(`${API_BASE}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      throw new Error(`Execution failed: ${res.statusText}`);
    }

    return res.json();
  },

  /**
   * Stops a running execution session.
   */
  async stop(sessionId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/execute/${sessionId}/stop`, {
      method: 'POST',
    });
    return res.ok;
  },

  /**
   * Fetches all snapshots for a completed session (for time-travel re-load).
   */
  async getSnapshots(sessionId: string): Promise<JvmSnapshot[]> {
    const res = await fetch(`${API_BASE}/api/snapshots/${sessionId}`);
    if (!res.ok) return [];
    return res.json();
  },

  /**
   * Fetches a single snapshot by step index.
   */
  async getSnapshot(sessionId: string, step: number): Promise<JvmSnapshot | null> {
    const res = await fetch(`${API_BASE}/api/snapshots/${sessionId}/${step}`);
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Health check.
   */
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
