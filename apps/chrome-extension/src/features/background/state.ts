import type { PersonPreviewData } from "../../lib/messaging/types";

export type PendingEnrichState = {
  contactId: string;
  linkedinHandle: string;
  requestId: string;
  linkedinTabId: number;
  senderTabId: number;
};

/** Mutable background service worker state shared across modules. */
export const backgroundState = {
  indicatorUpdateTimer: null as ReturnType<typeof setTimeout> | null,
  loginInProgress: false,
  pendingEnrich: null as PendingEnrichState | null,
  pendingPreview: null as PersonPreviewData | null,
};
