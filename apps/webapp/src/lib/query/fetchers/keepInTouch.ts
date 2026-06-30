import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/schemas";
import { appendAvatarParams } from "@/lib/avatarParams";
import { createClientFetcher } from "./createClientFetcher";

export interface KeepInTouchResult {
  contacts: Contact[];
}

export function buildKeepInTouchPath(): string {
  const params = new URLSearchParams();
  params.set("limit", "200");
  params.set("offset", "0");
  params.set("keepInTouch", "true");
  appendAvatarParams(params, "small");
  return `${API_ROUTES.CONTACTS}?${params.toString()}`;
}

export function createKeepInTouchQueryFn() {
  const fetch = createClientFetcher();
  const path = buildKeepInTouchPath();
  return async (): Promise<KeepInTouchResult> => {
    const raw = await fetch<{ contacts?: Contact[] }>(path);
    return { contacts: (raw.contacts ?? []) as Contact[] };
  };
}
