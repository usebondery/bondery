import { setClientCookie } from "@/lib/cookies/client";
import { MAP_PROJECTION_COOKIE_NAME } from "@/lib/cookies/constants";

export type MapProjectionPreference = "mercator" | "globe";

export function parseStoredMapProjection(
  value: string | undefined | null,
): MapProjectionPreference {
  if (value === "globe" || value === "mercator") {
    return value;
  }
  return "mercator";
}

export async function readMapProjectionPreference(): Promise<MapProjectionPreference> {
  const cookie = await cookieStore.get(MAP_PROJECTION_COOKIE_NAME);
  return parseStoredMapProjection(cookie?.value);
}

export async function persistMapProjectionPreference(
  value: MapProjectionPreference,
): Promise<void> {
  await setClientCookie(MAP_PROJECTION_COOKIE_NAME, value);
}
