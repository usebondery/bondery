import { type InlineToken, parseInlineTokens } from "@bondery/helpers";
import { parseContentBlocks } from "@/lib/chat/contentBlocks";

/**
 * Turns one inline token into spoken words.
 *
 * Return `null` when the record behind the token is unknown. The builder then
 * skips the token and keeps the rest of the sentence.
 */
export type TokenSpeaker = (token: InlineToken) => string | null;

/** Text parts of a chat message. A part without `text` is not speakable. */
interface SpeechTextPart {
  text?: string;
  type: string;
}

/** Chrome stops an utterance after roughly 15 seconds. 180 characters stay below it. */
export const SPEECH_CHUNK_TARGET_LENGTH = 180;

const BOLD_MARKER_RE = /\*\*/g;
const WIRE_TOKEN_RE = /\[\[bp:[^\]]+\]\]/g;
const WHITESPACE_RE = /\s+/g;
const PARAGRAPH_BREAK_RE = /\n{2,}/;
const SENTENCE_SPLIT_RE = /(?<=[.!?…])\s+/;
const SENTENCE_END_RE = /[.!?…:]$/;
const LEADING_PUNCTUATION_RE = /^[,.;:!?…)\]]/;

/**
 * Splits message parts into spoken paragraphs.
 *
 * A blank line starts a new paragraph. A list item is its own paragraph, so
 * each item gets a pause. Single line breaks collapse into one space.
 */
function speechParagraphs(parts: readonly SpeechTextPart[]): string[] {
  const paragraphs: string[] = [];

  for (const part of parts) {
    if (part.type !== "text" || typeof part.text !== "string") {
      continue;
    }
    for (const block of parseContentBlocks(part.text)) {
      if (block.kind === "list") {
        paragraphs.push(...block.items);
        continue;
      }
      paragraphs.push(...block.content.split(PARAGRAPH_BREAK_RE));
    }
  }

  return paragraphs;
}

/** Joins spoken pieces without a space before punctuation. */
function joinPieces(pieces: readonly string[]): string {
  let text = "";
  for (const piece of pieces) {
    if (!text) {
      text = piece;
      continue;
    }
    text = LEADING_PUNCTUATION_RE.test(piece) ? `${text}${piece}` : `${text} ${piece}`;
  }
  return text;
}

function speakParagraph(paragraph: string, resolve: TokenSpeaker): string {
  // Bold markers carry emphasis on screen. A voice has no bold.
  const tokens = parseInlineTokens(paragraph.replace(BOLD_MARKER_RE, ""));
  const pieces: string[] = [];

  for (const token of tokens) {
    const spoken = resolve(token);
    if (!spoken) {
      continue;
    }
    // An unknown token type stays as raw wire text. Never speak that.
    const cleaned = spoken.replace(WIRE_TOKEN_RE, " ").replace(WHITESPACE_RE, " ").trim();
    if (cleaned) {
      pieces.push(cleaned);
    }
  }

  return joinPieces(pieces);
}

/**
 * Builds the text a voice reads for one message.
 *
 * The builder is pure. It takes no React state and no query client. Each
 * paragraph ends with a pause. The result is `""` when nothing is speakable,
 * which hides the speak button.
 */
export function toSpeechText(parts: readonly SpeechTextPart[], resolve: TokenSpeaker): string {
  const sentences: string[] = [];

  for (const paragraph of speechParagraphs(parts)) {
    const spoken = speakParagraph(paragraph, resolve);
    if (!spoken) {
      continue;
    }
    sentences.push(SENTENCE_END_RE.test(spoken) ? spoken : `${spoken}.`);
  }

  return sentences.join(" ");
}

/**
 * Probe speaker for the enable check.
 *
 * Chips always count, because the message holds a chip. Text counts when it
 * has words. A link counts through its label. An action token does not count,
 * because the share card is a button.
 */
const PROBE_TOKEN: TokenSpeaker = (token) => {
  switch (token.type) {
    case "text":
      return token.value;
    case "link":
      return token.label;
    case "action":
      return null;
    case "date":
    case "group":
    case "interaction":
    case "person":
    case "tag":
      return PLACEHOLDER_SPEECH;
  }
};

const PLACEHOLDER_SPEECH = "x";

/**
 * True when the message holds something a voice can read.
 *
 * Cheap enough for every render. Use it to decide whether the speak button
 * exists at all.
 */
export function hasSpeakableText(parts: readonly SpeechTextPart[]): boolean {
  return toSpeechText(parts, PROBE_TOKEN).length > 0;
}

/** Cuts one over-long sentence on word boundaries. A single long word stays whole. */
function splitLongSentence(sentence: string): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const word of sentence.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > SPEECH_CHUNK_TARGET_LENGTH) {
      chunks.push(current);
      current = word;
      continue;
    }
    current = candidate;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Splits text into chunks a browser can speak without cutting the audio.
 *
 * Chunks end on sentence boundaries when possible and stay near
 * {@link SPEECH_CHUNK_TARGET_LENGTH} characters. A word is never split.
 */
export function splitSpeechText(text: string): string[] {
  const normalized = text.replace(WHITESPACE_RE, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of normalized.split(SENTENCE_SPLIT_RE)) {
    const trimmed = sentence.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.length > SPEECH_CHUNK_TARGET_LENGTH) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitLongSentence(trimmed));
      continue;
    }

    const candidate = current ? `${current} ${trimmed}` : trimmed;
    if (candidate.length > SPEECH_CHUNK_TARGET_LENGTH) {
      chunks.push(current);
      current = trimmed;
      continue;
    }
    current = candidate;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
