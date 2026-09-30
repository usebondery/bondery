import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { changelogGithubReleaseUrl, changelogHasGithubRelease } from "./changelog-github.js";

describe("changelog GitHub Release links", () => {
  it("links only tagged production cuts", () => {
    assert.equal(changelogHasGithubRelease("1.8.2"), false);
    assert.equal(changelogHasGithubRelease("1.8.3"), true);
    assert.equal(changelogHasGithubRelease("1.9.1"), false);
    assert.equal(changelogHasGithubRelease("1.9.2"), true);
    assert.equal(changelogHasGithubRelease("1.10.0"), true);
    assert.equal(changelogHasGithubRelease("1.10.0-rc.1"), false);
    assert.equal(
      changelogGithubReleaseUrl("1.8.3"),
      "https://github.com/usebondery/bondery/releases/tag/v1.8.3",
    );
    assert.equal(changelogGithubReleaseUrl("1.8.2"), null);
  });
});
