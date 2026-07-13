import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeSocialFieldInput } from "./analyze-social-input.js";

describe("analyzeSocialFieldInput", () => {
  it("suggests instagram when instagram URL is pasted in facebook field", () => {
    const result = analyzeSocialFieldInput("facebook", "https://instagram.com/janedoe", "");

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.suggestedField, "instagram");
    assert.equal(result.value, "janedoe");
    assert.equal(result.reason, "wrong_platform");
    assert.equal(result.targetHasValue, false);
  });

  it("suggests facebook when facebook URL is pasted in instagram field", () => {
    const result = analyzeSocialFieldInput("instagram", "https://www.facebook.com/janedoe", "");

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.suggestedField, "facebook");
    assert.equal(result.value, "janedoe");
  });

  it("suggests linkedin for linkedin /in/ URL in wrong field", () => {
    const result = analyzeSocialFieldInput("instagram", "https://www.linkedin.com/in/janedoe", "");

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.suggestedField, "linkedin");
    assert.equal(result.value, "janedoe");
  });

  it("suggests whatsapp for wa.me URL in linkedin field", () => {
    const result = analyzeSocialFieldInput("linkedin", "https://wa.me/14155552671", "");

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.suggestedField, "whatsapp");
    assert.equal(result.value, "+14155552671");
  });

  it("suggests website for generic URL in instagram field", () => {
    const result = analyzeSocialFieldInput("instagram", "https://janedoe.com", "");

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.suggestedField, "website");
    assert.equal(result.reason, "looks_like_website");
    assert.equal(result.value, "https://janedoe.com/");
  });

  it("suggests instagram when instagram URL is pasted in website field", () => {
    const result = analyzeSocialFieldInput("website", "https://instagram.com/janedoe", "");

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.suggestedField, "instagram");
    assert.equal(result.value, "janedoe");
  });

  it("suggests whatsapp for phone number in instagram field", () => {
    const result = analyzeSocialFieldInput("instagram", "+14155552671", "");

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.suggestedField, "whatsapp");
    assert.equal(result.reason, "looks_like_phone");
    assert.equal(result.value, "+14155552671");
  });

  it("commits bare username without reroute", () => {
    const result = analyzeSocialFieldInput("facebook", "janedoe", "");

    assert.deepEqual(result, {
      action: { action: "save", value: "janedoe" },
      outcome: "commit",
    });
  });

  it("sets targetHasValue when suggested field already has a different value", () => {
    const result = analyzeSocialFieldInput("facebook", "https://instagram.com/newhandle", "", {
      persistedByField: { instagram: "oldhandle" },
    });

    assert.equal(result.outcome, "suggest_reroute");
    if (result.outcome !== "suggest_reroute") {
      return;
    }

    assert.equal(result.targetHasValue, true);
    assert.equal(result.value, "newhandle");
  });

  it("skips reroute when skipReroute is true", () => {
    const result = analyzeSocialFieldInput("facebook", "https://instagram.com/janedoe", "", {
      skipReroute: true,
    });

    assert.deepEqual(result, {
      action: { action: "save", value: "https://instagram.com/janedoe" },
      outcome: "commit",
    });
  });
});
