let optimisticDocumentTitle: string | null = null;

/** Set before client navigation so the coordinator can apply the title immediately. */
export function setOptimisticDocumentTitle(title: string): void {
  optimisticDocumentTitle = title.trim() || null;
}

/** Read without clearing (coordinator uses on pathname change). */
export function peekOptimisticDocumentTitle(): string | null {
  return optimisticDocumentTitle;
}

/** Clear after the coordinator applies an optimistic title. */
export function clearOptimisticDocumentTitle(): void {
  optimisticDocumentTitle = null;
}
