import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("setClientCookie", () => {
  it("sets expires in milliseconds", async () => {
    let captured: { expires: number; name: string; value: string } | undefined;
    const previous = globalThis.cookieStore;
    globalThis.cookieStore = {
      set: async (options) => {
        captured = options as { expires: number; name: string; value: string };
      },
    } as CookieStore;

    const { setClientCookie } = await import("./client.js");

    const before = Date.now();
    await setClientCookie("test_cookie", "value", { maxAge: 3600 });

    assert.ok(captured);
    assert.equal(captured.name, "test_cookie");
    assert.equal(captured.value, "value");
    assert.ok(captured.expires >= before + 3600 * 1000 - 50);
    assert.ok(captured.expires <= before + 3600 * 1000 + 50);

    globalThis.cookieStore = previous;
  });
});
