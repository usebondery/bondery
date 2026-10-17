import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goBackOrReplace } from "./goBackOrReplace.ts";

describe("goBackOrReplace", () => {
  it("pops when the navigator has history", () => {
    const calls: string[] = [];
    goBackOrReplace(
      {
        back: () => {
          calls.push("back");
        },
        canGoBack: () => true,
        replace: (href: string) => {
          calls.push(`replace:${href}`);
        },
      },
      "/contacts",
    );

    assert.deepEqual(calls, ["back"]);
  });

  it("replaces when the navigator has no history", () => {
    const calls: string[] = [];
    goBackOrReplace(
      {
        back: () => {
          calls.push("back");
        },
        canGoBack: () => false,
        replace: (href: string) => {
          calls.push(`replace:${href}`);
        },
      },
      "/settings",
    );

    assert.deepEqual(calls, ["replace:/settings"]);
  });
});
