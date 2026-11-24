import type { ColumnKey } from "@/components/contacts/ContactsTableV2";
import type { MapCamera } from "@/components/map/PeopleMap";

export const MAP_TABLE_COLUMN_KEYS: ColumnKey[] = [
  "name",
  "headline",
  "location",
  "lastInteraction",
  "social",
];

export const MAP_HEIGHT_PX = 560;
export const MAP_CORNER_RADIUS_PX = 12;
/** Above the map canvas only — keep below Mantine Tooltip portals (~300). */
export const MAP_CHROME_Z_INDEX = 5;
/** Default camera when URL has no valid latitude/longitude/zoom (Atlantic overview). */
export const DEFAULT_MAP_CAMERA: MapCamera = { latitude: 35, longitude: -25, zoom: 3 };
/** Camera zoom after a silent granted GPS probe. */
export const GRANTED_LOCATION_ZOOM = 14;

export const ADDRESS_TYPE_COLOR: Record<string, string> = {
  home: "blue",
  other: "gray",
  work: "grape",
};
