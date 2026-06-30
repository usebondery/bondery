import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Activity } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";

export async function listInteractions(path: string) {
  return clientApiJson<{ interactions?: Activity[] }>(path);
}

export async function getInteraction(id: string) {
  return clientApiJson<{ interaction?: Activity }>(`${API_ROUTES.INTERACTIONS}/${id}`);
}

export async function createInteraction(body: Record<string, unknown>) {
  return clientApiJson<{ interaction?: Activity }>(API_ROUTES.INTERACTIONS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateInteraction(id: string, body: Record<string, unknown>) {
  return clientApiJson<{ interaction?: Activity }>(`${API_ROUTES.INTERACTIONS}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteInteraction(id: string) {
  await clientApiJson(`${API_ROUTES.INTERACTIONS}/${id}`, { method: "DELETE" });
}
