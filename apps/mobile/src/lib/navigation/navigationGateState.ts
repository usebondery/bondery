type NavigationGateSnapshot = {
  isTransitioning: boolean;
  lastAt: number;
  lastKey: string | null;
};

const TRANSITION_SAFETY_MS = 500;

let snapshot: NavigationGateSnapshot = {
  isTransitioning: false,
  lastAt: 0,
  lastKey: null,
};

let safetyTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getNavigationGateSnapshot(): NavigationGateSnapshot {
  return snapshot;
}

function subscribeNavigationGate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function clearSafetyTimeout(): void {
  if (safetyTimeout !== null) {
    clearTimeout(safetyTimeout);
    safetyTimeout = null;
  }
}

function setNavigationTransitioning(isTransitioning: boolean): void {
  if (snapshot.isTransitioning === isTransitioning) {
    return;
  }

  snapshot = { ...snapshot, isTransitioning };

  if (!isTransitioning) {
    clearSafetyTimeout();
  }

  emit();
}

function recordNavigationKey(key: string, now: number): void {
  snapshot = {
    ...snapshot,
    lastAt: now,
    lastKey: key,
  };
  emit();
}

/**
 * After a gated navigation, hold the lock until transitionEnd or a safety timeout.
 */
function armTransitionSafetyFallback(): void {
  clearSafetyTimeout();
  snapshot = { ...snapshot, isTransitioning: true };
  emit();

  safetyTimeout = setTimeout(() => {
    safetyTimeout = null;
    setNavigationTransitioning(false);
  }, TRANSITION_SAFETY_MS);
}

export type { NavigationGateSnapshot };
export {
  armTransitionSafetyFallback,
  getNavigationGateSnapshot,
  recordNavigationKey,
  setNavigationTransitioning,
  subscribeNavigationGate,
};
