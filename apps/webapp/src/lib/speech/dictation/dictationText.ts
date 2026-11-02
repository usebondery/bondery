/**
 * Pure text merging for one dictation session.
 *
 * The composer holds one string. Dictation owns only the slice between the
 * captured prefix and suffix, so text before and after the insertion point
 * never changes.
 */

export interface DictationInsertion {
  /** Final results accepted this session. */
  committed: string;
  /** The in-progress guess. The next event replaces it. Empty when none. */
  interim: string;
  /** Field text before the insertion point, captured at session start. */
  prefix: string;
  /** Field text after the insertion point. */
  suffix: string;
}

const WHITESPACE_RUN_RE = /\s+/g;
const LEADING_WHITESPACE_RE = /^\s+/;
const TRAILING_WHITESPACE_RE = /\s+$/;
const WHITESPACE_AT_END_RE = /\s$/;
const WHITESPACE_AT_START_RE = /^\s/;
const SENTENCE_END_RE = /[.!?…\n]\s*$/;
/** Start of the field, or any sentence boundary. Leading space is allowed. */
const SENTENCE_START_LETTER_RE = /(^[\s]*|[.!?…\n]\s*)(\p{L})/gu;
/** A sentence boundary inside the text only. The first letter stays as spoken. */
const INNER_SENTENCE_LETTER_RE = /([.!?…\n]\s*)(\p{L})/gu;

/**
 * Joins the two spoken parts.
 *
 * A transcript boundary never glues two words together. The browser sends
 * finals without a leading space.
 */
function mergeSpoken(insertion: DictationInsertion): string {
  const { committed, interim } = insertion;
  const needsSpace =
    committed !== "" &&
    interim !== "" &&
    !WHITESPACE_AT_END_RE.test(committed) &&
    !WHITESPACE_AT_START_RE.test(interim);
  const merged = needsSpace ? `${committed} ${interim}` : `${committed}${interim}`;

  return merged
    .replace(WHITESPACE_RUN_RE, " ")
    .replace(LEADING_WHITESPACE_RE, "")
    .replace(TRAILING_WHITESPACE_RE, "");
}

interface ComposedDictation {
  caret: number;
  value: string;
}

/**
 * Builds the field value and the caret position.
 *
 * The trailing edge of the speech is trimmed, so a separator never doubles. A
 * separator appears only where the neighbouring text needs one. No punctuation
 * is invented.
 */
function composeDictation(insertion: DictationInsertion): ComposedDictation {
  const { prefix, suffix } = insertion;
  const spoken = mergeSpoken(insertion);
  const sepBefore = prefix !== "" && !WHITESPACE_AT_END_RE.test(prefix) && spoken !== "" ? " " : "";
  const sepAfter =
    suffix !== "" && !WHITESPACE_AT_START_RE.test(suffix) && spoken !== "" ? " " : "";
  const beforeCaret = `${prefix}${sepBefore}${spoken}`;

  return { caret: beforeCaret.length, value: `${beforeCaret}${sepAfter}${suffix}` };
}

/** The field value after this insertion. */
export function composeDictationValue(insertion: DictationInsertion): string {
  return composeDictation(insertion).value;
}

/** Where the caret goes, so the next word continues the sentence. */
export function dictationCaretIndex(insertion: DictationInsertion): number {
  return composeDictation(insertion).caret;
}

/**
 * Uppercases the first letter of each sentence.
 *
 * `precedingText` is the field text before the insertion point. A letter after
 * a full stop, or at the start of the field, becomes uppercase. No letter is
 * ever lowercased, because the browser may return a name or an acronym.
 */
export function capitalizeDictationText(spoken: string, precedingText: string): string {
  if (spoken === "") {
    return spoken;
  }

  const atSentenceStart = precedingText === "" || SENTENCE_END_RE.test(precedingText);
  const pattern = atSentenceStart ? SENTENCE_START_LETTER_RE : INNER_SENTENCE_LETTER_RE;

  return spoken.replace(
    pattern,
    (_match, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`,
  );
}
