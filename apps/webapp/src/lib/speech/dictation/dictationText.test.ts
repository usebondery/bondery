import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capitalizeDictationText,
  composeDictationValue,
  dictationCaretIndex,
} from "./dictationText.js";

describe("composeDictationValue", () => {
  it("writes the speech into an empty field", () => {
    assert.equal(
      composeDictationValue({ committed: "hello there", interim: "", prefix: "", suffix: "" }),
      "hello there",
    );
  });

  it("keeps a space before the speech when the prefix has no trailing space", () => {
    assert.equal(
      composeDictationValue({ committed: "there", interim: "", prefix: "Hello", suffix: "" }),
      "Hello there",
    );
  });

  it("adds no second space when the prefix already ends with one", () => {
    assert.equal(
      composeDictationValue({ committed: "there", interim: "", prefix: "Hello ", suffix: "" }),
      "Hello there",
    );
  });

  it("keeps a space between the speech and a suffix", () => {
    assert.equal(
      composeDictationValue({ committed: "there", interim: "", prefix: "", suffix: "friend" }),
      "there friend",
    );
  });

  it("adds no second space when the suffix already starts with one", () => {
    assert.equal(
      composeDictationValue({ committed: "there", interim: "", prefix: "", suffix: " friend" }),
      "there friend",
    );
  });

  it("keeps text after the caret byte for byte", () => {
    const suffix = "\nsecond line, exactly as typed";
    // The suffix starts with whitespace, so no separator is added.
    assert.equal(
      composeDictationValue({ committed: "hello", interim: "", prefix: "", suffix }),
      `hello${suffix}`,
    );
  });

  it("never changes text before the caret", () => {
    const prefix = "  Keep   this  spacing\t";
    assert.equal(
      composeDictationValue({ committed: "hello", interim: "", prefix, suffix: "" }),
      `${prefix}hello`,
    );
  });

  it("joins committed and interim with one space", () => {
    assert.equal(
      composeDictationValue({ committed: "one", interim: "two", prefix: "", suffix: "" }),
      "one two",
    );
  });

  it("never glues two words when the committed text lacks a trailing space", () => {
    assert.equal(
      composeDictationValue({ committed: "one", interim: "two", prefix: "", suffix: "" }),
      "one two",
    );
  });

  it("replaces an interim with the next interim", () => {
    const first = composeDictationValue({
      committed: "",
      interim: "hel",
      prefix: "",
      suffix: "",
    });
    const second = composeDictationValue({
      committed: "",
      interim: "hello",
      prefix: "",
      suffix: "",
    });
    assert.equal(first, "hel");
    assert.equal(second, "hello");
  });

  it("collapses a whitespace run inside the speech", () => {
    assert.equal(
      composeDictationValue({
        committed: "one   two\nthree",
        interim: "",
        prefix: "",
        suffix: "",
      }),
      "one two three",
    );
  });

  it("trims the leading edge of the speech", () => {
    assert.equal(
      composeDictationValue({ committed: "  hello", interim: "", prefix: "", suffix: "" }),
      "hello",
    );
  });

  it("trims the trailing edge of the speech when no suffix follows", () => {
    assert.equal(
      composeDictationValue({ committed: "hello  ", interim: "", prefix: "", suffix: "" }),
      "hello",
    );
  });

  it("returns the field unchanged when the speech is empty", () => {
    assert.equal(
      composeDictationValue({ committed: "", interim: "", prefix: "Hello ", suffix: "friend" }),
      "Hello friend",
    );
  });

  it("writes the speech alone when the field is empty", () => {
    assert.equal(
      composeDictationValue({ committed: "", interim: "hello", prefix: "", suffix: "" }),
      "hello",
    );
  });
});

describe("dictationCaretIndex", () => {
  it("puts the caret at the end of the speech in an empty field", () => {
    assert.equal(
      dictationCaretIndex({ committed: "hello", interim: "", prefix: "", suffix: "" }),
      "hello".length,
    );
  });

  it("puts the caret after the separating space", () => {
    assert.equal(
      dictationCaretIndex({ committed: "there", interim: "", prefix: "Hello", suffix: "" }),
      "Hello there".length,
    );
  });

  it("puts the caret before the suffix separator", () => {
    const insertion = { committed: "there", interim: "", prefix: "", suffix: "friend" };
    assert.equal(dictationCaretIndex(insertion), "there".length);
    assert.equal(composeDictationValue(insertion).slice(0, "there".length), "there");
  });

  it("puts the caret at the end of the interim text", () => {
    assert.equal(
      dictationCaretIndex({ committed: "one", interim: "two", prefix: "", suffix: "" }),
      "one two".length,
    );
  });

  it("keeps the caret before unchanged text after the insertion point", () => {
    const insertion = {
      committed: "hello",
      interim: "",
      prefix: "Start ",
      suffix: " end",
    };
    const caret = dictationCaretIndex(insertion);
    const value = composeDictationValue(insertion);
    assert.equal(value.slice(caret), " end");
  });
});

describe("capitalizeDictationText", () => {
  it("uppercases the first letter of an empty field", () => {
    assert.equal(capitalizeDictationText("hello there", ""), "Hello there");
  });

  it("uppercases the first letter after a full stop", () => {
    assert.equal(capitalizeDictationText("hello there", "First one. "), "Hello there");
  });

  it("uppercases the first letter after a question mark", () => {
    assert.equal(capitalizeDictationText("yes", "Ready?"), "Yes");
  });

  it("uppercases the first letter after an exclamation mark", () => {
    assert.equal(capitalizeDictationText("yes", "Sure!"), "Yes");
  });

  it("uppercases the first letter after an ellipsis", () => {
    assert.equal(capitalizeDictationText("yes", "Well…"), "Yes");
  });

  it("uppercases the first letter after a newline", () => {
    assert.equal(capitalizeDictationText("hello", "First line\n"), "Hello");
  });

  it("keeps a lower-case letter mid-sentence", () => {
    assert.equal(capitalizeDictationText("hello", "One two "), "hello");
  });

  it("uppercases the first letter after an inner full stop in the speech", () => {
    assert.equal(capitalizeDictationText("one. two", "Start "), "one. Two");
  });

  it("uppercases both sentences when the field is empty", () => {
    assert.equal(capitalizeDictationText("one. two", ""), "One. Two");
  });

  it("never lowercases a letter", () => {
    assert.equal(capitalizeDictationText("Blake Smith", "Meeting "), "Blake Smith");
    assert.equal(capitalizeDictationText("IBM", ""), "IBM");
  });

  it("leaves the text alone when it is empty", () => {
    assert.equal(capitalizeDictationText("", "Start. "), "");
  });

  it("handles a leading space before the first letter", () => {
    assert.equal(capitalizeDictationText("  hello", ""), "  Hello");
  });
});
