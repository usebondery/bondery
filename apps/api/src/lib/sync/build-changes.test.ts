import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGroupDeleteChange,
  buildPeopleDeleteChange,
  buildTagDeleteChange,
} from "./build-changes.js";

describe("build-changes", () => {
  it("builds people delete change", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    assert.deepEqual(buildPeopleDeleteChange(id), {
      entityId: id,
      operation: "delete",
      table: "people",
      value: null,
    });
  });

  it("builds group delete change", () => {
    const id = "00000000-0000-4000-8000-000000000002";
    assert.deepEqual(buildGroupDeleteChange(id), {
      entityId: id,
      operation: "delete",
      table: "groups",
      value: null,
    });
  });

  it("builds tag delete change", () => {
    const id = "00000000-0000-4000-8000-000000000003";
    assert.deepEqual(buildTagDeleteChange(id), {
      entityId: id,
      operation: "delete",
      table: "tags",
      value: null,
    });
  });
});
