import type { StyleSpecification } from "maplibre-gl";

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** OSM raster basemap — same provider as the previous Leaflet TileLayer. */
export const OSM_RASTER_STYLE: StyleSpecification = {
  layers: [
    {
      id: "osm",
      source: "osm",
      type: "raster",
    },
  ],
  sources: {
    osm: {
      attribution: OSM_ATTRIBUTION,
      tileSize: 256,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      type: "raster",
    },
  },
  version: 8,
};
