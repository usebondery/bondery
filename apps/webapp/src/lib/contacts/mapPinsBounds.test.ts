import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boundsFromMapCamera,
  MAP_PINS_VIEWPORT_HEIGHT_PX,
  MAP_PINS_VIEWPORT_WIDTH_PX,
  normalizeMapPinsBounds,
} from "./mapPinsBounds.js";

describe("normalizeMapPinsBounds", () => {
  it("rounds coordinates so near-equal floats share a key", () => {
    const a = normalizeMapPinsBounds({
      maxLat: 50.123_456_789,
      maxLon: 14.987_654_321,
      minLat: 50.100_001_111,
      minLon: 14.900_009_999,
    });
    const b = normalizeMapPinsBounds({
      maxLat: 50.123_451_111,
      maxLon: 14.987_659_999,
      minLat: 50.100_008_888,
      minLon: 14.900_001_111,
    });
    assert.deepEqual(a, b);
    assert.deepEqual(a, {
      maxLat: 50.1235,
      maxLon: 14.9877,
      minLat: 50.1,
      minLon: 14.9,
    });
  });
});

describe("boundsFromMapCamera", () => {
  const size = {
    heightPx: MAP_PINS_VIEWPORT_HEIGHT_PX,
    widthPx: MAP_PINS_VIEWPORT_WIDTH_PX,
  };

  it("returns a bbox that contains the camera center", () => {
    const camera = { latitude: 38.72, longitude: -9.14, zoom: 12 };
    const bounds = boundsFromMapCamera(camera, size);
    assert.ok(bounds.minLat < camera.latitude && camera.latitude < bounds.maxLat);
    assert.ok(bounds.minLon < camera.longitude && camera.longitude < bounds.maxLon);
  });

  it("expands when padFraction increases", () => {
    const camera = { latitude: 50, longitude: 14, zoom: 10 };
    const tight = boundsFromMapCamera(camera, size, 0);
    const padded = boundsFromMapCamera(camera, size, 0.15);
    assert.ok(padded.minLat < tight.minLat);
    assert.ok(padded.maxLat > tight.maxLat);
    assert.ok(padded.minLon < tight.minLon);
    assert.ok(padded.maxLon > tight.maxLon);
  });

  it("clamps latitudes near the poles", () => {
    const bounds = boundsFromMapCamera({ latitude: 89, longitude: 0, zoom: 3 }, size, 0.5);
    assert.ok(bounds.maxLat <= 90);
    assert.ok(bounds.minLat >= -90);
  });

  it("clamps longitudes near the antimeridian", () => {
    const bounds = boundsFromMapCamera({ latitude: 0, longitude: 179, zoom: 2 }, size, 0.5);
    assert.ok(bounds.maxLon <= 180);
    assert.ok(bounds.minLon >= -180);
  });
});
