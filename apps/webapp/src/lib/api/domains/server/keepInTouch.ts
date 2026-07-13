import "server-only";

import {
  buildKeepInTouchPath,
  type KeepInTouchApiResponse,
  type KeepInTouchResult,
  parseKeepInTouchContacts,
} from "@/lib/api/resources/keepInTouch";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const CONTACTS_TAG = { next: { tags: ["contacts"] } } satisfies ServerApiFetchOptions;

export async function getKeepInTouchContactsServer(
  options: ReadOptions = {},
): Promise<KeepInTouchResult> {
  const raw = await serverApiJson<KeepInTouchApiResponse>(buildKeepInTouchPath(), undefined, {
    ...CONTACTS_TAG,
    ...options,
  });
  return parseKeepInTouchContacts(raw);
}
