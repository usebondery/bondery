import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { headingClassName } from "./headingClassName.ts";

describe("headingClassName", () => {
  it("maps order 1 to 28px bold", () => {
    assert.equal(headingClassName(1), "text-[28px] font-bold");
  });

  it("maps order 2 to 22px bold", () => {
    assert.equal(headingClassName(2), "text-[22px] font-bold");
  });

  it("maps order 3 to 18px bold", () => {
    assert.equal(headingClassName(3), "text-[18px] font-bold");
  });

  it("maps order 4 to 16px bold", () => {
    assert.equal(headingClassName(4), "text-[16px] font-bold");
  });

  it("maps order 5 to 15px semibold", () => {
    assert.equal(headingClassName(5), "text-[15px] font-semibold");
  });

  it("maps order 6 to 13px semibold", () => {
    assert.equal(headingClassName(6), "text-[13px] font-semibold");
  });
});
