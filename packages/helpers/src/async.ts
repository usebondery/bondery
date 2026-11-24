/**
 * Handle a promise without waiting. Use when a caller cannot await side work.
 * Pass `onRejected` when the caller has a logger or other reporter.
 */
export function detachPromise(
  promise: Promise<unknown>,
  onRejected?: (error: unknown) => void,
): void {
  promise.then(
    () => undefined,
    (error: unknown) => {
      onRejected?.(error);
    },
  );
}
