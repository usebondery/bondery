/**
 * Pure session state for one dictation run.
 *
 * The insertion window is captured once, when the session starts. Every later
 * result composes against that window, so text the user typed before or after
 * the caret never changes.
 */
import type { DictationResult } from "@/lib/speech/dictation/dictationEngine";
import {
  capitalizeDictationText,
  composeDictationValue,
  dictationCaretIndex,
} from "@/lib/speech/dictation/dictationText";

/** An open dictation session. */
export interface DictationSession {
  /** Where the caret goes after each write. */
  caret: number;
  /** Final results accepted so far, uncapitalised. */
  committed: string;
  /** The in-progress guess, uncapitalised. Replaced by the next event. */
  interim: string;
  /** Field text before the insertion point. */
  prefix: string;
  /** Field text after the insertion point. */
  suffix: string;
}

/** Appends a settled piece to the committed text with one space. */
function appendCommitted(committed: string, piece: string): string {
  const trimmed = piece.trim();
  if (trimmed === "") {
    return committed;
  }
  return committed === "" ? trimmed : `${committed} ${trimmed}`;
}

/**
 * Captures the window for a session that starts at `start..end` of `current`.
 *
 * A selected range is replaced, which matches typing behaviour.
 */
export function createDictationSession(
  current: string,
  start: number,
  end: number,
): DictationSession {
  return {
    caret: start,
    committed: "",
    interim: "",
    prefix: current.slice(0, start),
    suffix: current.slice(end),
  };
}

export interface ComposedDictationWrite {
  /** Caret position for the composed value. */
  caret: number;
  /** The next field value. */
  value: string;
}

/**
 * Folds one result into the session and composes the next field value.
 *
 * Mutates `session` in place, because the caller holds it in a ref. Returns the
 * text to write and where the caret belongs.
 */
export function applyDictationResult(
  session: DictationSession,
  result: DictationResult,
): ComposedDictationWrite {
  if (result.final !== "") {
    session.committed = appendCommitted(session.committed, result.final);
  }
  session.interim = result.interim;

  // Capitalisation follows the field, because a sentence can start mid-field.
  const committed = capitalizeDictationText(session.committed, session.prefix);
  const beforeInterim = composeDictationValue({
    committed,
    interim: "",
    prefix: session.prefix,
    suffix: "",
  });
  const interim = capitalizeDictationText(session.interim, beforeInterim);

  const insertion = {
    committed,
    interim,
    prefix: session.prefix,
    suffix: session.suffix,
  };
  session.caret = dictationCaretIndex(insertion);

  return { caret: session.caret, value: composeDictationValue(insertion) };
}

/** The interim text a preview shows. Empty when the recognizer holds none. */
export function sessionInterimPreview(session: DictationSession): string {
  const committed = capitalizeDictationText(session.committed, session.prefix);
  const beforeInterim = composeDictationValue({
    committed,
    interim: "",
    prefix: session.prefix,
    suffix: "",
  });
  return capitalizeDictationText(session.interim, beforeInterim);
}
