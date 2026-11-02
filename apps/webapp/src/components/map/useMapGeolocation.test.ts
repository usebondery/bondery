import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { readMapGeolocationIfGranted } from "./useMapGeolocation.js";

interface GeoHarness {
  getCurrentPositionCalls: number;
  lastPositionOptions: PositionOptions | undefined;
  queryCalls: number;
}

type PermissionMode = PermissionState | "missing" | "throw";

function installGeoMocks(options: {
  geolocation?: boolean;
  permission?: PermissionMode;
  position?: { latitude: number; longitude: number } | "error";
  secure?: boolean;
}): GeoHarness {
  const harness: GeoHarness = {
    getCurrentPositionCalls: 0,
    lastPositionOptions: undefined,
    queryCalls: 0,
  };

  const geolocation =
    options.geolocation === false
      ? undefined
      : {
          getCurrentPosition(
            success: PositionCallback,
            error?: PositionErrorCallback,
            positionOptions?: PositionOptions,
          ) {
            harness.getCurrentPositionCalls += 1;
            harness.lastPositionOptions = positionOptions;
            if (options.position === "error") {
              error?.({
                code: 2,
                message: "unavailable",
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
              } as GeolocationPositionError);
              return;
            }
            const coords = options.position ?? { latitude: 38.72, longitude: -9.14 };
            success({
              coords: {
                accuracy: 1,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                latitude: coords.latitude,
                longitude: coords.longitude,
                speed: null,
              },
              timestamp: Date.now(),
            } as GeolocationPosition);
          },
        };

  let permissions: Navigator["permissions"] | undefined;
  if (options.permission === "missing") {
    permissions = undefined;
  } else if (options.permission === "throw") {
    permissions = {
      query: async () => {
        harness.queryCalls += 1;
        throw new Error("not supported");
      },
    } as Navigator["permissions"];
  } else {
    const state = options.permission ?? "prompt";
    permissions = {
      query: async () => {
        harness.queryCalls += 1;
        return { state } as PermissionStatus;
      },
    } as Navigator["permissions"];
  }

  const mockNavigator = {
    geolocation,
    permissions,
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      isSecureContext: options.secure ?? true,
      navigator: mockNavigator,
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: mockNavigator,
  });

  return harness;
}

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "navigator");
  }
});

describe("readMapGeolocationIfGranted", () => {
  it("returns the GPS fix when permission is already granted", async () => {
    const harness = installGeoMocks({
      permission: "granted",
      position: { latitude: 38.72, longitude: -9.14 },
    });

    assert.deepEqual(await readMapGeolocationIfGranted(), {
      latitude: 38.72,
      longitude: -9.14,
    });
    assert.equal(harness.getCurrentPositionCalls, 1);
    assert.deepEqual(harness.lastPositionOptions, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 10_000,
    });
  });

  it("does not call getCurrentPosition when permission is prompt", async () => {
    const harness = installGeoMocks({ permission: "prompt" });

    assert.equal(await readMapGeolocationIfGranted(), null);
    assert.equal(harness.getCurrentPositionCalls, 0);
  });

  it("does not call getCurrentPosition when permission is denied", async () => {
    const harness = installGeoMocks({ permission: "denied" });

    assert.equal(await readMapGeolocationIfGranted(), null);
    assert.equal(harness.getCurrentPositionCalls, 0);
  });

  it("treats a missing permissions.query API as not granted", async () => {
    const harness = installGeoMocks({ permission: "missing" });

    assert.equal(await readMapGeolocationIfGranted(), null);
    assert.equal(harness.getCurrentPositionCalls, 0);
  });

  it("treats a throwing permissions.query as not granted", async () => {
    const harness = installGeoMocks({ permission: "throw" });

    assert.equal(await readMapGeolocationIfGranted(), null);
    assert.equal(harness.getCurrentPositionCalls, 0);
    assert.equal(harness.queryCalls, 1);
  });

  it("skips GPS in an insecure context", async () => {
    const harness = installGeoMocks({ permission: "granted", secure: false });

    assert.equal(await readMapGeolocationIfGranted(), null);
    assert.equal(harness.getCurrentPositionCalls, 0);
  });

  it("skips GPS when geolocation is unsupported", async () => {
    const harness = installGeoMocks({ geolocation: false, permission: "granted" });

    assert.equal(await readMapGeolocationIfGranted(), null);
    assert.equal(harness.getCurrentPositionCalls, 0);
  });

  it("returns null when a granted GPS read fails", async () => {
    const harness = installGeoMocks({ permission: "granted", position: "error" });

    assert.equal(await readMapGeolocationIfGranted(), null);
    assert.equal(harness.getCurrentPositionCalls, 1);
  });
});
