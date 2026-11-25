import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { envPinsVersion, withVersionPin } from "./pin-dokploy-version.mjs";

const DOMAIN_LINE_RE = /^BONDERY_INFRA_API_DOMAIN=api\.usebondery\.com$/m;
const PIN_LINE_RE = /^BONDERY_INFRA_VERSION=1\.11\.5$/m;
const PIN_KEY_RE = /BONDERY_INFRA_VERSION/g;
const NEVER_RC_RE = /never an RC/;

describe("withVersionPin", () => {
  it("adds the pin and keeps the other keys", () => {
    const env = withVersionPin("BONDERY_INFRA_API_DOMAIN=api.usebondery.com", "1.11.5");
    assert.match(env, DOMAIN_LINE_RE);
    assert.match(env, PIN_LINE_RE);
  });

  it("replaces an older pin", () => {
    const env = withVersionPin("BONDERY_INFRA_VERSION=1.11.2\nA=b", "1.11.5");
    assert.equal(env.match(PIN_KEY_RE)?.length, 1);
    assert.ok(envPinsVersion(env, "1.11.5"));
    assert.ok(!envPinsVersion(env, "1.11.2"));
  });

  it("handles a compose app with no env", () => {
    assert.ok(envPinsVersion(withVersionPin(null, "1.11.5"), "1.11.5"));
  });

  it("refuses a release candidate or a floating tag", () => {
    assert.throws(() => withVersionPin("", "1.11.5-rc.1"), NEVER_RC_RE);
    assert.throws(() => withVersionPin("", "production"), NEVER_RC_RE);
    assert.throws(() => withVersionPin("", "v1.11.5"), NEVER_RC_RE);
  });
});
