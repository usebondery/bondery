import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMapCameraToSearchParams,
  isSameMapCameraInSearchParams,
  parseMapCameraSearchParams,
  serializeMapCamera,
} from "./mapUrlCamera.js";

describe("parseMapCameraSearchParams", () => {
  it("returns null when any param is missing", () => {
    assert.equal(parseMapCameraSearchParams(new URLSearchParams()), null);
    assert.equal(parseMapCameraSearchParams(new URLSearchParams("latitude=1&longitude=2")), null);
    assert.equal(parseMapCameraSearchParams(new URLSearchParams("latitude=1&zoom=3")), null);
    assert.equal(parseMapCameraSearchParams(new URLSearchParams("longitude=2&zoom=3")), null);
  });

  it("returns null for non-finite values", () => {
    assert.equal(
      parseMapCameraSearchParams(new URLSearchParams("latitude=abc&longitude=1&zoom=3")),
      null,
    );
    assert.equal(
      parseMapCameraSearchParams(new URLSearchParams("latitude=1&longitude=NaN&zoom=3")),
      null,
    );
    assert.equal(
      parseMapCameraSearchParams(new URLSearchParams("latitude=1&longitude=2&zoom=Infinity")),
      null,
    );
  });

  it("parses valid camera values", () => {
    assert.deepEqual(
      parseMapCameraSearchParams(new URLSearchParams("latitude=38.72&longitude=-9.14&zoom=12.4")),
      { latitude: 38.72, longitude: -9.14, zoom: 12.4 },
    );
  });

  it("clamps latitude, longitude, and zoom into valid ranges", () => {
    assert.deepEqual(
      parseMapCameraSearchParams(new URLSearchParams("latitude=120&longitude=-200&zoom=50")),
      {
        latitude: 90,
        longitude: -180,
        zoom: 22,
      },
    );
    assert.deepEqual(
      parseMapCameraSearchParams(new URLSearchParams("latitude=-120&longitude=200&zoom=-5")),
      {
        latitude: -90,
        longitude: 180,
        zoom: 0,
      },
    );
  });
});

describe("applyMapCameraToSearchParams / serializeMapCamera", () => {
  it("rounds latitude/longitude to 5 decimals and zoom to 1 decimal", () => {
    const serialized = serializeMapCamera({
      latitude: 38.123456789,
      longitude: -9.987654321,
      zoom: 12.46,
    });
    assert.deepEqual(serialized, {
      latitude: "38.12346",
      longitude: "-9.98765",
      zoom: "12.5",
    });

    const params = new URLSearchParams("view=locations&foo=bar&lat=1&lng=2&z=3");
    applyMapCameraToSearchParams(params, {
      latitude: 38.123456789,
      longitude: -9.987654321,
      zoom: 12.46,
    });
    assert.equal(params.get("view"), "locations");
    assert.equal(params.get("foo"), "bar");
    assert.equal(params.get("latitude"), "38.12346");
    assert.equal(params.get("longitude"), "-9.98765");
    assert.equal(params.get("zoom"), "12.5");
    assert.equal(params.get("lat"), null);
    assert.equal(params.get("lng"), null);
    assert.equal(params.get("z"), null);
  });
});

describe("isSameMapCameraInSearchParams", () => {
  it("compares rounded cameras (short or padded query decimals)", () => {
    const params = new URLSearchParams("latitude=38.72&longitude=-9.14&zoom=12.4");
    assert.equal(
      isSameMapCameraInSearchParams(params, {
        latitude: 38.72,
        longitude: -9.14,
        zoom: 12.4,
      }),
      true,
    );
    assert.equal(
      isSameMapCameraInSearchParams(params, {
        latitude: 38.72,
        longitude: -9.14,
        zoom: 12.5,
      }),
      false,
    );
  });
});
