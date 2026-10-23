import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPersonAvatarSources, isHttpAvatarUri } from "./personAvatarSources.ts";

const LOCAL_FILE = "file:///data/user/0/avatars/person-1.jpg";
const REMOTE_HTTPS = "https://storage.example/avatars/user/person-1.jpg";
const REMOTE_HTTP = "http://storage.example/avatars/user/person-1.jpg";
const PICKER_FILE = "file:///tmp/picker-photo.jpg";
const PICKER_CONTENT = "content://media/external/images/media/42";

describe("isHttpAvatarUri", () => {
  it("accepts http and https", () => {
    assert.equal(isHttpAvatarUri(REMOTE_HTTP), true);
    assert.equal(isHttpAvatarUri(REMOTE_HTTPS), true);
    assert.equal(isHttpAvatarUri("HTTPS://CDN.EXAMPLE/a.jpg"), true);
  });

  it("rejects picker and empty URIs", () => {
    assert.equal(isHttpAvatarUri(PICKER_FILE), false);
    assert.equal(isHttpAvatarUri(PICKER_CONTENT), false);
    assert.equal(isHttpAvatarUri(""), false);
  });
});

describe("buildPersonAvatarSources", () => {
  it("returns only a picker file URI", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: LOCAL_FILE,
        skipLocalFile: false,
        uri: PICKER_FILE,
      }),
      [PICKER_FILE],
    );
  });

  it("returns only a content picker URI", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: LOCAL_FILE,
        skipLocalFile: false,
        uri: PICKER_CONTENT,
      }),
      [PICKER_CONTENT],
    );
  });

  it("prepends the local file then the https URL", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: LOCAL_FILE,
        skipLocalFile: false,
        uri: REMOTE_HTTPS,
      }),
      [LOCAL_FILE, REMOTE_HTTPS],
    );
  });

  it("prepends the local file then the http URL", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: LOCAL_FILE,
        skipLocalFile: false,
        uri: REMOTE_HTTP,
      }),
      [LOCAL_FILE, REMOTE_HTTP],
    );
  });

  it("skips the local file when skipLocalFile is true", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: LOCAL_FILE,
        skipLocalFile: true,
        uri: REMOTE_HTTPS,
      }),
      [REMOTE_HTTPS],
    );
  });

  it("returns an empty chain when uri is null and there is no local file", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: null,
        skipLocalFile: false,
        uri: null,
      }),
      [],
    );
  });

  it("returns only the local file when uri is null", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: LOCAL_FILE,
        skipLocalFile: false,
        uri: null,
      }),
      [LOCAL_FILE],
    );
  });

  it("returns an empty chain when uri is null and local is skipped", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: LOCAL_FILE,
        skipLocalFile: true,
        uri: null,
      }),
      [],
    );
  });

  it("does not duplicate when localFileUri equals the remote uri", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: REMOTE_HTTPS,
        skipLocalFile: false,
        uri: REMOTE_HTTPS,
      }),
      [REMOTE_HTTPS],
    );
  });

  it("treats http and https as distinct remote URLs", () => {
    assert.deepEqual(
      buildPersonAvatarSources({
        localFileUri: REMOTE_HTTP,
        skipLocalFile: false,
        uri: REMOTE_HTTPS,
      }),
      [REMOTE_HTTP, REMOTE_HTTPS],
    );
  });
});
