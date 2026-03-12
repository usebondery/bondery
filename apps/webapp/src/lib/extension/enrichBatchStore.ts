/**
 * Module-level singleton store for batch LinkedIn enrichment state.
 *
 * Using a module-level store (rather than React state) means the enrichment
 * process survives within-app navigation — a component that unmounts and
 * remounts will always see the current in-flight state.
 *
 * Compatible with React 18's `useSyncExternalStore`.
 */

export interface EnrichBatchState {
  /** True while the auth check is in progress but before enrichment has started. */
  isLoading: boolean;
  /** True while the enrichment loop is actively running. */
  isRunning: boolean;
  /**
   * Total eligible contacts at the start of the run (set from init response).
   * Used as the progress bar denominator.
   */
  totalEligible: number;
  completed: number;
  failed: number;
  /** The contact currently being enriched, or null between contacts. */
  currentPerson: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
  } | null;
  /**
   * Set when pending queue rows are detected on mount (interrupted run).
   * Drives the global resume notification. Cleared when a resume or discard occurs.
   */
  pendingQueueStatus: { pending: number; completed: number; failed: number } | null;
}

export const defaultState: EnrichBatchState = {
  isLoading: false,
  isRunning: false,
  totalEligible: 0,
  completed: 0,
  failed: 0,
  currentPerson: null,
  pendingQueueStatus: null,
};

// ─── Internal store ───────────────────────────────────────────────────────────

let state: EnrichBatchState = { ...defaultState };

// Separate flag so toggling it does not trigger a React re-render.
let cancelled = false;

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a snapshot of the current state.
 * Pass directly to `useSyncExternalStore` as the `getSnapshot` argument.
 */
export function getState(): EnrichBatchState {
  return state;
}

/**
 * Merges a partial state update and notifies all subscribers.
 */
export function setState(patch: Partial<EnrichBatchState>): void {
  state = { ...state, ...patch };
  notify();
}

/**
 * Resets the store to `defaultState` and clears the cancelled flag.
 */
export function resetState(): void {
  state = { ...defaultState };
  cancelled = false;
  notify();
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 * Pass directly to `useSyncExternalStore` as the `subscribe` argument.
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Returns true if the current run has been cancelled. */
export function isCancelled(): boolean {
  return cancelled;
}

/** Sets the cancelled flag without triggering a re-render. */
export function setCancelled(value: boolean): void {
  cancelled = value;
}

/**
 * Sets the pending queue status detected on page load (interrupted run).
 * Pass `null` to clear it once the user resumes or discards.
 */
export function setPendingQueueStatus(status: EnrichBatchState["pendingQueueStatus"]): void {
  state = { ...state, pendingQueueStatus: status };
  notify();
}
