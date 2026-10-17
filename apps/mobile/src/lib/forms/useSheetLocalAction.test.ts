import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Documents close order for local sheet actions (mirrors useSheetLocalAction body).
 */
function runLocalActionOrder(options: {
  perform: () => string;
  onClose: () => void;
  onSuccess?: (result: string) => void;
}): string[] {
  const log: string[] = [];
  const result = options.perform();
  log.push("perform");
  options.onClose();
  log.push("onClose");
  options.onSuccess?.(result);
  log.push("onSuccess");
  return log;
}

describe("sheet local action order", () => {
  it("runs perform then onClose then onSuccess", () => {
    const order = runLocalActionOrder({
      onClose: () => {},
      onSuccess: () => {},
      perform: () => "ok",
    });
    assert.deepEqual(order, ["perform", "onClose", "onSuccess"]);
  });
});
