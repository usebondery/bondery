import { setWorkerUrl } from "maplibre-gl";

const MAPLIBRE_WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

let didSetWorkerUrl = false;

/**
 * Point MapLibre at the same-origin worker copied into `public/maplibre/`.
 * Call once before the first Map mounts (Turbopack leaves the default URL empty).
 */
export function ensureMapLibreWorker(): void {
  if (didSetWorkerUrl || typeof window === "undefined") {
    return;
  }
  setWorkerUrl(MAPLIBRE_WORKER_URL);
  didSetWorkerUrl = true;
}
