/**
 * Poll until `isReady` is true, or `timeoutMs` elapses.
 *
 * Use `setTimeout` / `setInterval`, never `requestAnimationFrame`.
 * Chrome pauses rAF in inactive tabs, so a background enrich tab never
 * reaches the timeout check.
 */
export function pollUntil(
  isReady: () => boolean,
  timeoutMs: number,
  onTick?: () => void,
  intervalMs = 250,
): Promise<boolean> {
  if (isReady()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let watchdogId: ReturnType<typeof setTimeout> | undefined;

    const finish = (value: boolean) => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
      if (watchdogId !== undefined) {
        clearTimeout(watchdogId);
      }
      resolve(value);
    };

    watchdogId = setTimeout(() => finish(isReady()), timeoutMs);
    intervalId = setInterval(() => {
      onTick?.();
      if (isReady()) {
        finish(true);
      }
    }, intervalMs);
  });
}
