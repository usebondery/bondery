import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareTriples,
  minExtensionFailures,
  newestPublishedVersion,
} from "./check-min-extension-version.mjs";

const MIN_ABOVE_RE = /MIN_EXTENSION_VERSION 1\.11\.3 is above/;
const RECORD_RE = /live-extension-version\.json/;

const release = (tagName, flags = {}) => ({
  isDraft: false,
  isPrerelease: false,
  tagName,
  ...flags,
});

/** The state of 1.11.4: v1.11.3 and v1.11.4 are tagged, only v1.11.2 is published. */
const releases = [
  release("v1.11.4", { isDraft: true }),
  release("v1.11.3", { isDraft: true }),
  release("v1.11.3-rc.5", { isPrerelease: true }),
  release("v1.11.2"),
  release("v1.11.1"),
];

describe("newestPublishedVersion", () => {
  it("skips drafts and prereleases, and compares numerically", () => {
    assert.equal(newestPublishedVersion(releases), "1.11.2");
    assert.equal(newestPublishedVersion([release("v1.9.0"), release("v1.10.0")]), "1.10.0");
  });

  it("is undefined when nothing is published", () => {
    assert.equal(newestPublishedVersion([release("v1.0.0", { isDraft: true })]), undefined);
  });
});

describe("minExtensionFailures", () => {
  it("fails for the 1.11.4 state: MIN 1.11.3 is above the live 1.11.2", () => {
    const failures = minExtensionFailures({ min: "1.11.3", record: "1.11.2", releases });
    assert.equal(failures.length, 1);
    assert.match(failures[0], MIN_ABOVE_RE);
  });

  it("passes when MIN equals or sits below the live version", () => {
    assert.deepEqual(minExtensionFailures({ min: "1.11.2", record: "1.11.2", releases }), []);
    assert.deepEqual(minExtensionFailures({ min: "1.11.0", record: "1.11.2", releases }), []);
  });

  it("fails when the record claims a version that was never published", () => {
    const failures = minExtensionFailures({ min: "1.11.2", record: "1.11.4", releases });
    assert.equal(failures.length, 1);
    assert.match(failures[0], RECORD_RE);
  });

  it("fails when no release is published", () => {
    assert.equal(minExtensionFailures({ min: "0.0.0", record: "0.0.0", releases: [] }).length, 1);
  });
});

describe("compareTriples", () => {
  it("orders by major, minor, then patch", () => {
    assert.ok(compareTriples("1.11.2", "1.11.3") < 0);
    assert.ok(compareTriples("1.12.0", "1.11.9") > 0);
    assert.equal(compareTriples("2.0.0", "2.0.0"), 0);
  });
});
