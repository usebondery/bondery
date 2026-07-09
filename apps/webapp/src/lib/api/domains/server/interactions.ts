import "server-only";

import type { Activity } from "@bondery/schemas";
import {
  buildInteractionDetailPath,
  buildInteractionsListPath,
  type InteractionsListParams,
  type InteractionsListResult,
  parseInteractionDetail,
  parseInteractionsList,
} from "@/lib/api/resources/interactions";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const INTERACTIONS_TAG = { next: { tags: ["interactions"] } } satisfies ServerApiFetchOptions;

export async function getInteractionsListServer(
  params: InteractionsListParams = {},
  options: ReadOptions = {},
): Promise<InteractionsListResult> {
  const raw = await serverApiJson<Record<string, unknown>>(
    buildInteractionsListPath(params),
    undefined,
    { ...INTERACTIONS_TAG, ...options },
  );
  return parseInteractionsList(raw, params.limit ?? 50);
}

export async function getInteractionDetailServer(
  id: string,
  options: ReadOptions = {},
): Promise<Activity> {
  const raw = await serverApiJson<{ interaction?: Activity }>(
    buildInteractionDetailPath(id),
    undefined,
    { ...INTERACTIONS_TAG, ...options },
  );
  return parseInteractionDetail(raw);
}
