import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pushOutsideCircles } from "./graphHull.js";

describe("pushOutsideCircles", () => {
  const circle = { cx: 0, cy: 0, r: 10 };

  it("leaves a point that is already outside", () => {
    assert.deepEqual(pushOutsideCircles(12, 0, [circle]), { x: 12, y: 0 });
  });

  it("moves a point inside a circle out to the rim", () => {
    const point = pushOutsideCircles(3, 0, [circle]);
    assert.equal(point.y, 0);
    assert.ok(Math.abs(point.x - 10) < 1e-9);
  });

  it("pushes the center out along the x axis", () => {
    assert.deepEqual(pushOutsideCircles(0, 0, [circle]), { x: 10, y: 0 });
  });
});
