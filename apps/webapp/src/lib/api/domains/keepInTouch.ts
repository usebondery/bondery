import { clientApiJson } from "@/lib/api/client";
import {
  buildKeepInTouchPath,
  type KeepInTouchApiResponse,
  type KeepInTouchResult,
  parseKeepInTouchContacts,
} from "@/lib/api/resources/keepInTouch";

export type { KeepInTouchResult };

export async function getKeepInTouchContacts(): Promise<KeepInTouchResult> {
  const raw = await clientApiJson<KeepInTouchApiResponse>(buildKeepInTouchPath());
  return parseKeepInTouchContacts(raw);
}
