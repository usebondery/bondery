import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  highestNamedRc,
  infraPinCalver,
  isProductionCalver,
  isRc,
  latestProductionCalver,
  overlayProductionCalver,
  parseCalver,
  previousProductionCalver,
  toChromeVersion,
  toCoreCalver,
  toDockerTag,
  toGitTag,
  toNpm,
} from "./calver.js";

describe("parseCalver", () => {
  it("parses production CalVer", () => {
    assert.deepEqual(parseCalver("1.9.1"), { major: 1, minor: 9, patch: 1, rc: null });
  });

  it("parses RC with optional v prefix", () => {
    assert.deepEqual(parseCalver("v1.9.1-rc.1"), { major: 1, minor: 9, patch: 1, rc: 1 });
    assert.deepEqual(parseCalver("1.9.1-rc.12"), { major: 1, minor: 9, patch: 1, rc: 12 });
  });

  it("rejects rc.0, Chrome 4-part, and 1.9.1.rc-1", () => {
    assert.throws(() => parseCalver("1.9.1-rc.0"), /Invalid CalVer/);
    assert.throws(() => parseCalver("1.9.1.1"), /Invalid CalVer/);
    assert.throws(() => parseCalver("1.9.1.rc-1"), /Invalid CalVer/);
    assert.throws(() => parseCalver("1.9.1-beta.1"), /Invalid CalVer/);
  });
});

describe("calver formatters", () => {
  it("maps production and RC identities", () => {
    const prod = parseCalver("1.9.1");
    const rc = parseCalver("1.9.1-rc.1");
    assert.equal(toNpm(prod), "1.9.1");
    assert.equal(toDockerTag(prod), "1.9.1");
    assert.equal(toGitTag(prod), "v1.9.1");
    assert.equal(toChromeVersion(prod), "1.9.1");
    assert.equal(toNpm(rc), "1.9.1-rc.1");
    assert.equal(toDockerTag(rc), "1.9.1-rc.1");
    assert.equal(toGitTag(rc), "v1.9.1-rc.1");
    assert.equal(toChromeVersion(rc), "1.9.1.1");
    assert.equal(toCoreCalver(rc), "1.9.1");
    assert.equal(isProductionCalver(prod), true);
    assert.equal(isRc(prod), false);
    assert.equal(isProductionCalver(rc), false);
    assert.equal(isRc(rc), true);
  });
});

describe("previousProductionCalver", () => {
  const tags = ["v1.8.3", "v1.9.0", "v1.9.1-rc.1", "v1.9.1-rc.2", "ext-1.9.0"];

  it("uses latest production tag excluding the CalVer being shipped", () => {
    assert.equal(previousProductionCalver(tags, "1.9.1"), "1.9.0");
    assert.equal(previousProductionCalver(tags, "1.9.1-rc.1"), "1.9.0");
  });

  it("does not treat stripped RC as MIN", () => {
    assert.notEqual(previousProductionCalver(tags, "1.9.1-rc.1"), "1.9.1");
  });

  it("fails when no production tags remain", () => {
    assert.throws(() => previousProductionCalver(["v1.9.1-rc.1"], "1.9.1-rc.1"), /No previous/);
  });
});

describe("infraPinCalver and latestProductionCalver", () => {
  const tags = ["v1.9.0", "v1.8.3"];

  it("pins production package to itself and RC to previous production", () => {
    assert.equal(infraPinCalver("1.9.1", tags), "1.9.1");
    assert.equal(infraPinCalver("1.9.1-rc.1", tags), "1.9.0");
  });

  it("advertises current production CalVer, not the RC string", () => {
    assert.equal(latestProductionCalver("1.9.1", "1.9.0"), "1.9.1");
    assert.equal(latestProductionCalver("1.9.1-rc.1", "1.9.0"), "1.9.0");
  });
});

describe("highestNamedRc", () => {
  it("picks the highest integer N, not string sort", () => {
    assert.equal(
      highestNamedRc(["v1.9.2-rc.9", "v1.9.2-rc.10", "v1.9.1-rc.99", "v1.9.2"], "1.9.2"),
      "1.9.2-rc.10",
    );
  });

  it("accepts tags without a v prefix and coreCalver with an RC suffix", () => {
    assert.equal(highestNamedRc(["1.9.2-rc.1", "v1.9.2-rc.2"], "1.9.2-rc.1"), "1.9.2-rc.2");
  });

  it("fails when no named RC exists for that CalVer", () => {
    assert.throws(() => highestNamedRc(["v1.9.2", "v1.9.1-rc.1"], "1.9.2"), /No named RC/);
  });
});

describe("overlayProductionCalver", () => {
  it("uses a production pin over an RC package.json", () => {
    assert.equal(overlayProductionCalver("1.9.2-rc.2", "1.9.2"), "1.9.2");
    assert.equal(overlayProductionCalver("1.9.2-rc.2", " 1.9.2 "), "1.9.2");
  });

  it("keeps package.json when env is unset, RC, beta, or garbage", () => {
    assert.equal(overlayProductionCalver("1.9.2-rc.2", undefined), "1.9.2-rc.2");
    assert.equal(overlayProductionCalver("1.9.2-rc.2", ""), "1.9.2-rc.2");
    assert.equal(overlayProductionCalver("1.9.2-rc.2", "1.9.2-rc.1"), "1.9.2-rc.2");
    assert.equal(overlayProductionCalver("1.9.2-rc.2", "beta"), "1.9.2-rc.2");
    assert.equal(overlayProductionCalver("1.9.2-rc.2", "not-a-version"), "1.9.2-rc.2");
  });
});
