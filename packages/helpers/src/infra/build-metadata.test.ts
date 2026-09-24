import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  buildLivenessStatus,
  buildReadinessStatus,
  readBuildMetadata,
  readRuntimeProductVersion,
} from "./build-metadata.js";

const originalVersion = process.env.BONDERY_INFRA_VERSION;
const originalGitSha = process.env.BONDERY_INFRA_GIT_SHA;

afterEach(() => {
  if (originalVersion === undefined) {
    delete process.env.BONDERY_INFRA_VERSION;
  } else {
    process.env.BONDERY_INFRA_VERSION = originalVersion;
  }
  if (originalGitSha === undefined) {
    delete process.env.BONDERY_INFRA_GIT_SHA;
  } else {
    process.env.BONDERY_INFRA_GIT_SHA = originalGitSha;
  }
});

describe("readBuildMetadata", () => {
  it("returns empty metadata when env vars are unset", () => {
    delete process.env.BONDERY_INFRA_VERSION;
    delete process.env.BONDERY_INFRA_GIT_SHA;
    assert.deepEqual(readBuildMetadata(), {});
  });

  it("trims version and gitSha from env", () => {
    process.env.BONDERY_INFRA_VERSION = " 1.8.0 ";
    process.env.BONDERY_INFRA_GIT_SHA = "abc123 ";
    assert.deepEqual(readBuildMetadata(), { gitSha: "abc123", version: "1.8.0" });
  });
});

describe("readRuntimeProductVersion", () => {
  it("overlays a production pin over an RC package.json", () => {
    process.env.BONDERY_INFRA_VERSION = "1.9.2";
    assert.equal(readRuntimeProductVersion("1.9.2-rc.2"), "1.9.2");
  });

  it("falls back to package.json for unset, beta, or garbage pins", () => {
    delete process.env.BONDERY_INFRA_VERSION;
    assert.equal(readRuntimeProductVersion("1.9.2-rc.2"), "1.9.2-rc.2");
    process.env.BONDERY_INFRA_VERSION = "beta";
    assert.equal(readRuntimeProductVersion("1.9.2-rc.2"), "1.9.2-rc.2");
    process.env.BONDERY_INFRA_VERSION = "nope";
    assert.equal(readRuntimeProductVersion("1.9.2-rc.2"), "1.9.2-rc.2");
  });
});

describe("buildLivenessStatus", () => {
  it("returns ok status with timestamp and optional metadata", () => {
    process.env.BONDERY_INFRA_VERSION = "1.9.1-rc.1";
    process.env.BONDERY_INFRA_GIT_SHA = "deadbeef";
    const body = buildLivenessStatus();
    assert.equal(body.status, "ok");
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(body.version, "1.9.1-rc.1");
    assert.equal(body.gitSha, "deadbeef");
  });
});

describe("buildReadinessStatus", () => {
  it("returns ok when healthy", () => {
    const body = buildReadinessStatus(true);
    assert.equal(body.status, "ok");
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns unhealthy with error when not ok", () => {
    const body = buildReadinessStatus(false, "Invalid runtime config");
    assert.equal(body.status, "unhealthy");
    assert.equal(body.error, "Invalid runtime config");
  });
});
