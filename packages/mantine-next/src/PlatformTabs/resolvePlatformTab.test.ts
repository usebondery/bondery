import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePlatformTab } from "#PlatformTabs/resolvePlatformTab.js";

const ITEM_VALUES = ["ios", "android", "thunderbird"] as const;
const OS_DEFAULT = { android: "android", ios: "ios", linux: "thunderbird" } as const;

describe("resolvePlatformTab", () => {
  it("renders the first tab before the OS is known (server and first client render)", () => {
    const tab = resolvePlatformTab({
      itemValues: ITEM_VALUES,
      os: "undetermined",
      osDefault: OS_DEFAULT,
    });

    assert.equal(tab, "ios");
  });

  it("follows osDefault once the OS is known", () => {
    assert.equal(
      resolvePlatformTab({ itemValues: ITEM_VALUES, os: "android", osDefault: OS_DEFAULT }),
      "android",
    );
    assert.equal(
      resolvePlatformTab({ itemValues: ITEM_VALUES, os: "linux", osDefault: OS_DEFAULT }),
      "thunderbird",
    );
  });

  it("falls back to the first tab when the OS has no mapping", () => {
    assert.equal(
      resolvePlatformTab({ itemValues: ITEM_VALUES, os: "windows", osDefault: OS_DEFAULT }),
      "ios",
    );
  });

  it("falls back to the first tab without osDefault", () => {
    assert.equal(resolvePlatformTab({ itemValues: ITEM_VALUES, os: "android" }), "ios");
  });

  it("prefers defaultValue over the OS guess", () => {
    assert.equal(
      resolvePlatformTab({
        defaultValue: "thunderbird",
        itemValues: ITEM_VALUES,
        os: "android",
        osDefault: OS_DEFAULT,
      }),
      "thunderbird",
    );
  });

  it("prefers the reader's pick over everything", () => {
    assert.equal(
      resolvePlatformTab({
        defaultValue: "thunderbird",
        itemValues: ITEM_VALUES,
        os: "android",
        osDefault: OS_DEFAULT,
        pickedValue: "ios",
      }),
      "ios",
    );
  });

  it("skips a value that matches no tab", () => {
    assert.equal(
      resolvePlatformTab({
        defaultValue: "missing",
        itemValues: ITEM_VALUES,
        os: "android",
        osDefault: OS_DEFAULT,
        pickedValue: "gone",
      }),
      "android",
    );
  });

  it("returns null with no tabs", () => {
    assert.equal(resolvePlatformTab({ itemValues: [], os: "android" }), null);
  });
});
