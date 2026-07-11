import { clientApiJson } from "@/lib/api/client";
import {
  buildKeepInTouchPath,
  KEEP_IN_TOUCH_COUNT_PATH,
  type KeepInTouchApiResponse,
  type KeepInTouchResult,
  parseKeepInTouchContacts,
  parseKeepInTouchCount,
} from "@/lib/api/resources/keepInTouch";

export type { KeepInTouchResult };

export async function getKeepInTouchContacts(): Promise<KeepInTouchResult> {
  const raw = await clientApiJson<KeepInTouchApiResponse>(buildKeepInTouchPath());
  return parseKeepInTouchContacts(raw);
}

export async function getKeepInTouchOverdueCount(): Promise<number> {
  const raw = await clientApiJson<{ overdueCount: number }>(KEEP_IN_TOUCH_COUNT_PATH);
  return parseKeepInTouchCount(raw);
}
