import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEV_URLS } from "@bondery/schemas/constants/dev-ports";

import { portlessHttpsHostnames } from "./connect-remote-portless.mjs";

describe("portlessHttpsHostnames", () => {
  it("lists every HTTPS .test host from DEV_URLS", () => {
    assert.deepEqual(portlessHttpsHostnames(DEV_URLS), [
      "api.usebondery.test",
      "app.usebondery.test",
      "mail.usebondery.test",
      "usebondery.test",
    ]);
  });

  it("skips http loopback URLs", () => {
    assert.deepEqual(
      portlessHttpsHostnames({
        api: "https://api.usebondery.test",
        mobile: "http://localhost:26634",
        website: "https://usebondery.test",
      }),
      ["api.usebondery.test", "usebondery.test"],
    );
  });
});
