import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapsePersonMentionsFromEditor,
  expandPersonMentionsForEditor,
  formatPersonMentionLink,
  parsePersonMentionUrl,
} from "./personMentionFormat.js";

describe("personMentionFormat", () => {
  const names = new Map([
    ["uuid-1", "Alice Smith"],
    ["uuid-2", "Bob Jones"],
  ]);
  const getName = (id: string) => names.get(id);

  it("expands tokens to editor links", () => {
    const input = "Met [[bp:person:uuid-1]] at lunch with [[bp:person:uuid-2]].";
    const result = expandPersonMentionsForEditor(input, getName);
    assert.equal(
      result,
      "Met [@Alice Smith](bp://person/uuid-1) at lunch with [@Bob Jones](bp://person/uuid-2).",
    );
  });

  it("uses @ fallback when name is unknown", () => {
    const result = expandPersonMentionsForEditor("[[bp:person:unknown]]", getName);
    assert.equal(result, "[@](bp://person/unknown)");
  });

  it("collapses editor links to tokens", () => {
    const input =
      "Met [@Alice Smith](bp://person/uuid-1) and **[@Bob Jones](bp://person/uuid-2)**.";
    const result = collapsePersonMentionsFromEditor(input);
    assert.equal(
      result,
      "Met [[bp:person:uuid-1]] and **[[bp:person:uuid-2]]**.",
    );
  });

  it("round-trips token → link → token", () => {
    const original = "Note about [[bp:person:uuid-1]] and [[bp:person:uuid-2]].";
    const expanded = expandPersonMentionsForEditor(original, getName);
    const collapsed = collapsePersonMentionsFromEditor(expanded);
    assert.equal(collapsed, original);
  });

  it("formats insert link payload", () => {
    assert.deepEqual(formatPersonMentionLink("Alice", "uuid-1"), {
      displayText: "@Alice",
      url: "bp://person/uuid-1",
    });
    assert.deepEqual(formatPersonMentionLink("@Alice", "uuid-1"), {
      displayText: "@Alice",
      url: "bp://person/uuid-1",
    });
  });

  it("parses person mention URLs", () => {
    assert.equal(parsePersonMentionUrl("bp://person/uuid-1"), "uuid-1");
    assert.equal(parsePersonMentionUrl("https://example.com"), null);
    assert.equal(parsePersonMentionUrl("bp://person/"), null);
  });
});
