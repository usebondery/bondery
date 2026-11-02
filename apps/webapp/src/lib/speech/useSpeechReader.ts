"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { SpeechErrorCode } from "@/lib/speech/speechEngine";
import { getSpeechEngine } from "@/lib/speech/speechEngine";

export type SpeechStatus = "idle" | "preparing" | "speaking" | "paused";

export interface SpeechReaderState {
  error: SpeechErrorCode | null;
  messageId: string | null;
  status: SpeechStatus;
}

/** Builds the spoken text and the language tag once the query cache is warm. */
export type SpeechPrepare = () => Promise<{ lang: string; text: string }>;

const IDLE_STATE: SpeechReaderState = { error: null, messageId: null, status: "idle" };

let state: SpeechReaderState = IDLE_STATE;

/** Increments on every request, so a late prepare result is dropped. */
let prepareToken = 0;

const listeners = new Set<() => void>();

function setState(next: SpeechReaderState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SpeechReaderState {
  return state;
}

/** The server has no speech, so it renders the idle state. */
function getServerSnapshot(): SpeechReaderState {
  return IDLE_STATE;
}

function isSupportedSnapshot(): boolean {
  return getSpeechEngine().isSupported();
}

/** The server never supports speech. This avoids a hydration mismatch. */
function isSupportedServerSnapshot(): boolean {
  return false;
}

/**
 * Stops speech and drops any pending prepare.
 *
 * The engine reports the stop through `onEnd`. That handler returns the store
 * to idle, so this function does not set state itself.
 */
function cancel(): void {
  prepareToken += 1;
  getSpeechEngine().cancel();
}

/**
 * Routes every terminal engine event back into the store.
 *
 * The handlers live here because the engine lives for the page lifetime. A
 * chat component remount must not drop them.
 */
function bindHandlers(): void {
  getSpeechEngine().setHandlers({
    onEnd: () => {
      if (state.status !== "idle") {
        setState(IDLE_STATE);
      }
    },
    onError: (code) => {
      // Keep the owner id, so only that message shows the error toast.
      setState({ error: code, messageId: state.messageId, status: "idle" });
    },
  });
}

/** Clears a reported error so the next click starts a fresh attempt. */
export function clearSpeechError(): void {
  if (state.error !== null) {
    setState(IDLE_STATE);
  }
}

export interface UseSpeechReaderResult {
  /** Set once on a failure. The button shows one toast, then calls `clearSpeechError`. */
  error: SpeechErrorCode | null;
  status: SpeechStatus;
  supported: boolean;
  toggle: () => void;
}

/**
 * Reads one message aloud.
 *
 * One message owns the reader at a time, so a second message stops the first.
 * A message that is not the owner always reads `idle`, which keeps a single
 * Pause button on screen.
 *
 * `prepare` runs on a click, never on render. It may await the query cache on
 * the cold path, which is what the `preparing` state covers.
 */
export function useSpeechReader(messageId: string, prepare: SpeechPrepare): UseSpeechReaderResult {
  const engine = getSpeechEngine();
  const supported = useSyncExternalStore(subscribe, isSupportedSnapshot, isSupportedServerSnapshot);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOwner = snapshot.messageId === messageId;

  const start = useCallback(async () => {
    const token = ++prepareToken;
    setState({ error: null, messageId, status: "preparing" });

    let prepared: { lang: string; text: string };
    try {
      prepared = await prepare();
    } catch {
      if (token === prepareToken) {
        setState({ error: "synthesis-failed", messageId, status: "idle" });
      }
      return;
    }

    // Another message started, or the user stopped, while the text loaded.
    if (token !== prepareToken || state.messageId !== messageId) {
      return;
    }

    if (!prepared.text.trim()) {
      setState(IDLE_STATE);
      return;
    }

    bindHandlers();
    setState({ error: null, messageId, status: "speaking" });
    engine.speak(prepared);
  }, [engine, messageId, prepare]);

  const toggle = useCallback(() => {
    switch (isOwner ? snapshot.status : "idle") {
      case "preparing":
        return;
      case "speaking":
        engine.pause();
        setState({ ...snapshot, status: "paused" });
        return;
      case "paused":
        engine.resume();
        setState({ ...snapshot, status: "speaking" });
        return;
      case "idle": {
        // A different message owns the reader. Stop it before the new one
        // starts, so only one utterance is queued.
        if (!isOwner && state.messageId !== null) {
          cancel();
        }
        void start();
        return;
      }
    }
  }, [engine, isOwner, snapshot, start]);

  // A closed session or a route change unmounts the message. Speech then stops
  // instead of resuming later on another page.
  useEffect(() => {
    return () => {
      if (state.messageId === messageId) {
        cancel();
      }
    };
  }, [messageId]);

  return {
    error: isOwner ? snapshot.error : null,
    status: isOwner ? snapshot.status : "idle",
    supported,
    toggle,
  };
}
