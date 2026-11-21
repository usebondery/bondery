"use client";

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import {
  type MapUrlCamera,
  serializeMapCamera,
} from "@/app/(app)/app/(shell)/map/utils/mapUrlCamera";
import {
  getMapPins,
  type MapAddressPinsResult,
  type MapContactPinsResult,
  type MapPinsMode,
} from "@/lib/api/domains/contacts";
import {
  boundsFromMapCamera,
  MAP_PINS_VIEWPORT_HEIGHT_PX,
  MAP_PINS_VIEWPORT_WIDTH_PX,
} from "@/lib/contacts/mapPinsBounds";
import { contactKeys } from "@/lib/query/keys";
import { throwIfPageCannotRender } from "@/lib/query/pageLoadFailure";

const MAP_PINS_STALE_TIME_MS = 60_000;
/** Keep pin responses across person-detail navigation (default gc is 5 min). */
const MAP_PINS_GC_TIME_MS = 15 * 60_000;

export function useMapPinsQuery(
  mode: "contact",
  camera: MapUrlCamera | null,
  enabled?: boolean,
): UseQueryResult<MapContactPinsResult>;
export function useMapPinsQuery(
  mode: "address",
  camera: MapUrlCamera | null,
  enabled?: boolean,
): UseQueryResult<MapAddressPinsResult>;
export function useMapPinsQuery(
  mode: MapPinsMode,
  camera: MapUrlCamera | null,
  enabled = true,
): UseQueryResult<MapContactPinsResult | MapAddressPinsResult> {
  const cameraKey = camera ? serializeMapCamera(camera) : undefined;
  return useQuery<MapContactPinsResult | MapAddressPinsResult>({
    enabled: enabled && camera != null,
    gcTime: MAP_PINS_GC_TIME_MS,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!camera) {
        throw new Error("Map camera is required");
      }
      const bounds = boundsFromMapCamera(camera, {
        heightPx: MAP_PINS_VIEWPORT_HEIGHT_PX,
        widthPx: MAP_PINS_VIEWPORT_WIDTH_PX,
      });
      if (mode === "contact") {
        return getMapPins("contact", bounds);
      }
      return getMapPins("address", bounds);
    },
    queryKey: contactKeys.mapPins(mode, cameraKey),
    staleTime: MAP_PINS_STALE_TIME_MS,
    throwOnError: throwIfPageCannotRender,
  });
}
