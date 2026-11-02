import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InlineToken } from "@bondery/helpers";
import {
  hasSpeakableText,
  SPEECH_CHUNK_TARGET_LENGTH,
  splitSpeechText,
  toSpeechText,
} from "./speechText.js";

/** Stub speaker. Every chip token resolves to a fixed phrase. */
const stubResolve = (token: InlineToken): string | null => {
  switch (token.type) {
    case "text":
      return token.value;
    case "person":
      return "Contact Blake Smith";
    case "group":
      return "Group Family";
    case "tag":
      return "Tag College friends";
    case "interaction":
      return "Interaction Coffee";
    case "date":
      return "January 5, 2026";
    case "link":
      return token.label;
    case "action":
      return null;
  }
};

/** Stub speaker that resolves no chip. Every chip record is unknown. */
const unresolvedResolve = (token: InlineToken): string | null => {
  if (token.type === "text") {
    return token.value;
  }
  if (token.type === "link") {
    return token.label;
  }
  return null;
};

describe("toSpeechText", () => {
  it("keeps plain text and adds a closing period", () => {
    assert.equal(
      toSpeechText([{ text: "Hello there", type: "text" }], stubResolve),
      "Hello there.",
    );
  });

  it("strips bold markers and keeps the words", () => {
    assert.equal(
      toSpeechText([{ text: "This is **very** good.", type: "text" }], stubResolve),
      "This is very good.",
    );
  });

  it("speaks a person chip through the resolver", () => {
    assert.equal(
      toSpeechText([{ text: "You met [[bp:person:8f3c]] last week.", type: "text" }], stubResolve),
      "You met Contact Blake Smith last week.",
    );
  });

  it("speaks group, tag, and interaction chips", () => {
    assert.equal(
      toSpeechText(
        [
          {
            text: "[[bp:group:1]] and [[bp:tag:2]] and [[bp:interaction:3]].",
            type: "text",
          },
        ],
        stubResolve,
      ),
      "Group Family and Tag College friends and Interaction Coffee.",
    );
  });

  it("speaks a date chip as a month name", () => {
    assert.equal(
      toSpeechText(
        [{ text: "Born [[bp:date:2026-01-05T00:00:00.000Z]].", type: "text" }],
        stubResolve,
      ),
      "Born January 5, 2026.",
    );
  });

  it("speaks the link label and drops the URL", () => {
    assert.equal(
      toSpeechText(
        [{ text: "See [the docs](https://example.com/a/b) for details.", type: "text" }],
        stubResolve,
      ),
      "See the docs for details.",
    );
  });

  it("skips an unresolved chip and keeps the sentence", () => {
    assert.equal(
      toSpeechText(
        [{ text: "You met [[bp:person:8f3c]] last week.", type: "text" }],
        unresolvedResolve,
      ),
      "You met last week.",
    );
  });

  it("returns an empty string when only a chip is present and unresolved", () => {
    assert.equal(
      toSpeechText([{ text: "[[bp:person:8f3c]]", type: "text" }], unresolvedResolve),
      "",
    );
  });

  it("keeps a chip-only message speakable when the chip resolves", () => {
    assert.equal(
      toSpeechText([{ text: "[[bp:group:1]]", type: "text" }], stubResolve),
      "Group Family.",
    );
  });

  it("never speaks raw wire text for an unknown token type", () => {
    assert.equal(
      toSpeechText([{ text: "Hi [[bp:nope:1]] there", type: "text" }], stubResolve),
      "Hi there.",
    );
  });

  it("turns list items into separate sentences and drops the markers", () => {
    assert.equal(
      toSpeechText([{ text: "- one\n- two\n- three", type: "text" }], stubResolve),
      "one. two. three.",
    );
  });

  it("separates paragraphs with a pause", () => {
    assert.equal(
      toSpeechText([{ text: "First part\n\nSecond part", type: "text" }], stubResolve),
      "First part. Second part.",
    );
  });

  it("collapses a single line break into one space", () => {
    assert.equal(toSpeechText([{ text: "one\ntwo", type: "text" }], stubResolve), "one two.");
  });

  it("ignores non-text parts", () => {
    assert.equal(
      toSpeechText(
        [{ text: "Only words.", type: "text" }, { type: "tool-search_contacts" }],
        stubResolve,
      ),
      "Only words.",
    );
  });

  it("returns an empty string for whitespace-only parts", () => {
    assert.equal(toSpeechText([{ text: "   \n  ", type: "text" }], stubResolve), "");
    assert.equal(toSpeechText([], stubResolve), "");
  });
});

describe("hasSpeakableText", () => {
  it("is true for text", () => {
    assert.equal(hasSpeakableText([{ text: "Words.", type: "text" }]), true);
  });

  it("is true for a chip-only message", () => {
    assert.equal(hasSpeakableText([{ text: "[[bp:person:8f3c]]", type: "text" }]), true);
  });

  it("is false for whitespace and for no parts", () => {
    assert.equal(hasSpeakableText([{ text: "  \n ", type: "text" }]), false);
    assert.equal(hasSpeakableText([]), false);
  });

  it("is false for an action token alone", () => {
    assert.equal(
      hasSpeakableText([{ text: "[[bp:action:share-contact|uuid]]", type: "text" }]),
      false,
    );
  });
});

describe("splitSpeechText", () => {
  it("returns no chunk for empty text", () => {
    assert.deepEqual(splitSpeechText(""), []);
    assert.deepEqual(splitSpeechText("   "), []);
  });

  it("keeps a short text in one chunk", () => {
    assert.deepEqual(splitSpeechText("One short line."), ["One short line."]);
  });

  it("groups sentences up to the target length", () => {
    const sentence = "This sentence is short.";
    const chunks = splitSpeechText(`${sentence} ${sentence}`);
    assert.equal(chunks.length, 1);
    assert.ok(chunks[0].length <= SPEECH_CHUNK_TARGET_LENGTH);
  });

  it("starts a new chunk before the target length is exceeded", () => {
    const sentence = `${"a".repeat(60)}.`;
    const chunks = splitSpeechText(Array.from({ length: 6 }, () => sentence).join(" "));
    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= SPEECH_CHUNK_TARGET_LENGTH, `chunk too long: ${chunk.length}`);
    }
  });

  it("never splits a word", () => {
    const longWord = "b".repeat(SPEECH_CHUNK_TARGET_LENGTH + 40);
    const chunks = splitSpeechText(`Start. ${longWord} End.`);
    assert.ok(chunks.includes(longWord));
  });

  it("ends chunks on a sentence boundary when it can", () => {
    const first = `${"c".repeat(100)}.`;
    const second = `${"d".repeat(100)}.`;
    assert.deepEqual(splitSpeechText(`${first} ${second}`), [first, second]);
  });

  it("collapses whitespace before splitting", () => {
    assert.deepEqual(splitSpeechText("one\n\ntwo   three"), ["one two three"]);
  });
});
