import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Activity } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  buildInteractionDetailPath,
  buildInteractionsListPath,
  type InteractionsListParams,
  type InteractionsListResult,
  parseInteractionDetail,
  parseInteractionsList,
} from "@/lib/api/resources/interactions";

export type { InteractionsListParams, InteractionsListResult };

export async function getInteractionsList(
  params: InteractionsListParams = {},
): Promise<InteractionsListResult> {
  const raw = await clientApiJson<Record<string, unknown>>(buildInteractionsListPath(params));
  return parseInteractionsList(raw, params.limit ?? 50);
}

export async function getInteractionDetail(id: string): Promise<Activity> {
  const raw = await clientApiJson<{ interaction?: Activity }>(buildInteractionDetailPath(id));
  return parseInteractionDetail(raw);
}

export async function createInteraction(body: Record<string, unknown>) {
  return clientApiJson<{ interaction?: Activity }>(API_ROUTES.INTERACTIONS, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function updateInteraction(id: string, body: Record<string, unknown>) {
  return clientApiJson<{ interaction?: Activity }>(`${API_ROUTES.INTERACTIONS}/${id}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export async function deleteInteraction(id: string) {
  await clientApiJson(`${API_ROUTES.INTERACTIONS}/${id}`, { method: "DELETE" });
}
