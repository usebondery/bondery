import type { Map as MapLibreMap, SkySpecification } from "maplibre-gl";
import type { MapProjectionPreference } from "./mapProjectionPreference";

/** Atmosphere fade for globe projection (MapLibre sky docs). */
const GLOBE_SKY: SkySpecification = {
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
};

/** Mercator: no atmosphere (Map `setSky` requires a SkySpecification in our typings). */
const MERCATOR_SKY: SkySpecification = {
  "atmosphere-blend": 0,
};

/**
 * Apply projection plus sky/atmosphere visuals.
 * MapRef omits setProjection/setSky; pass `map.getMap()` (MapLibre Map).
 */
export function applyMapProjectionVisuals(
  map: MapLibreMap,
  projection: MapProjectionPreference,
): void {
  map.setProjection({ type: projection });
  map.setSky(projection === "globe" ? GLOBE_SKY : MERCATOR_SKY);
}
