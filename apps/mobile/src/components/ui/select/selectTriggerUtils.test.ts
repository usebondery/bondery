import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SELECT_TRIGGER_TRAILING_ICON_SIZE,
  SELECT_TRIGGER_TRAILING_SLOT_SIZE_PX,
  shouldShowSelectClear,
} from "./selectTriggerUtils.ts";

describe("select trigger trailing slot", () => {
  it("uses ActionIcon sm dimensions and consistent icon size", () => {
    assert.equal(SELECT_TRIGGER_TRAILING_SLOT_SIZE_PX, 32);
    assert.equal(SELECT_TRIGGER_TRAILING_ICON_SIZE, 18);
  });
});

describe("shouldShowSelectClear", () => {
  it("shows clear only for clearable fields with a value", () => {
    assert.equal(shouldShowSelectClear(true, true, false), true);
    assert.equal(shouldShowSelectClear(true, false, false), false);
    assert.equal(shouldShowSelectClear(false, true, false), false);
    assert.equal(shouldShowSelectClear(true, true, true), false);
  });
});
