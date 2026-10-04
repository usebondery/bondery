import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  EnrichQueueCountResponse,
  EnrichQueueInitResponse,
  EnrichQueueNextBatchItem,
  EnrichQueueNextBatchResponse,
  EnrichQueueStatusCounts,
} from "@bondery/schemas";

export const ENRICH_QUEUE_COUNT_PATH = API_ROUTES.CONTACTS_ENRICH_QUEUE_COUNT;
export const ENRICH_QUEUE_STATUS_PATH = `${API_ROUTES.CONTACTS}/enrich-queue/status`;

export function buildEnrichQueuePath(): string {
  return `${API_ROUTES.CONTACTS}/enrich-queue`;
}

export function buildEnrichQueueInitPath(): string {
  return `${API_ROUTES.CONTACTS}/enrich-queue/init`;
}

export function buildEnrichQueueNextBatchPath(): string {
  return `${API_ROUTES.CONTACTS}/enrich-queue/next-batch`;
}

export function buildEnrichQueueItemPath(queueItemId: string): string {
  return `${API_ROUTES.CONTACTS}/enrich-queue/${queueItemId}`;
}

export function parseEnrichQueueCount(raw: EnrichQueueCountResponse): number {
  return raw.eligibleCount ?? 0;
}

export interface EnrichQueueStatus {
  completed: number;
  failed: number;
  pending: number;
}

export function parseEnrichQueueStatus(
  raw: EnrichQueueStatusCounts | null | undefined,
): EnrichQueueStatus | null {
  if (!raw || raw.pending <= 0) {
    return null;
  }
  return raw;
}

export function parseEnrichQueueInit(raw: EnrichQueueInitResponse): EnrichQueueInitResponse {
  return { totalEligible: raw.totalEligible ?? 0 };
}

export function parseEnrichQueueNextBatch(
  raw: EnrichQueueNextBatchResponse,
): EnrichQueueNextBatchItem[] {
  return raw.items ?? [];
}
