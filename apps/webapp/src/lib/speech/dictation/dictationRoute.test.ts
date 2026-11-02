import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyLocalSpeech, selectDictationRoute } from "./dictationRoute.js";

describe("classifyLocalSpeech", () => {
  it("treats an installed pack as available", () => {
    assert.equal(classifyLocalSpeech("available"), "available");
  });

  it("treats a pack the browser can fetch as installable", () => {
    assert.equal(classifyLocalSpeech("downloadable"), "installable");
    assert.equal(classifyLocalSpeech("downloading"), "installable");
  });

  it("treats a timeout and a missing pack as unavailable", () => {
    assert.equal(classifyLocalSpeech("unavailable"), "unavailable");
    assert.equal(classifyLocalSpeech("timeout"), "unavailable");
  });
});

describe("selectDictationRoute", () => {
  it("uses an installed pack in every browser", () => {
    assert.equal(selectDictationRoute({ brave: false, local: "available" }), "local");
    assert.equal(selectDictationRoute({ brave: true, local: "available" }), "local");
  });

  it("asks Brave to install a pack when that is the only route", () => {
    assert.equal(selectDictationRoute({ brave: true, local: "installable" }), "install");
  });

  it("keeps the cloud path when another browser can install a pack", () => {
    assert.equal(selectDictationRoute({ brave: false, local: "installable" }), "cloud");
  });

  it("does not open the microphone in Brave when no pack exists", () => {
    assert.equal(selectDictationRoute({ brave: true, local: "unavailable" }), "none");
  });

  it("uses the cloud path in other browsers", () => {
    assert.equal(selectDictationRoute({ brave: false, local: "unavailable" }), "cloud");
  });
});
