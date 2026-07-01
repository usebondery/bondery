import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGroupDeleteChange,
  buildPeopleDeleteChange,
  buildTagDeleteChange,
} from "./build-changes";

describe("build-changes", () => {
  it("builds people delete change", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    assert.deepEqual(buildPeopleDeleteChange(id), {
      table: "people",
      operation: "delete",
      entityId: id,
      value: null,
    });
  });

  it("builds group delete change", () => {
    const id = "00000000-0000-4000-8000-000000000002";
    assert.deepEqual(buildGroupDeleteChange(id), {
      table: "groups",
      operation: "delete",
      entityId: id,
      value: null,
    });
  });

  it("builds tag delete change", () => {
    const id = "00000000-0000-4000-8000-000000000003";
    assert.deepEqual(buildTagDeleteChange(id), {
      table: "tags",
      operation: "delete",
      entityId: id,
      value: null,
    });
  });
});
