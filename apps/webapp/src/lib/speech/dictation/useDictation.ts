"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DictationAvailability } from "@/lib/speech/dictation/dictationAvailability";
import { resolveDictationAvailability } from "@/lib/speech/dictation/dictationAvailability";
import type { DictationErrorCode, DictationResult } from "@/lib/speech/dictation/dictationEngine";
import { getDictationEngine } from "@/lib/speech/dictation/dictationEngine";
import {
  createDictationEngineHandlers,
  type DictationStatus,
  isLiveStatus,
  statusForError,
} from "@/lib/speech/dictation/dictationHandlers";
import { readDictationPermission } from "@/lib/speech/dictation/dictationPermission";
import { checkDictationPreflight } from "@/lib/speech/dictation/dictationPreflight";
import {
  createDictationRestartWindow,
  type DictationRestartWindow,
} from "@/lib/speech/dictation/dictationRestartPolicy";
import {
  type DictationRoute,
  readDictationRouteChoice,
  resolveDictationRoute,
} from "@/lib/speech/dictation/dictationRoute";
import {
  applyDictationResult,
  createDictationSession,
  type DictationSession,
  sessionInterimPreview,
} from "@/lib/speech/dictation/dictationSession";

export type { DictationAvailability, DictationStatus };

/** Live selection of the field. */
export interface DictationSelection {
  end: number;
  start: number;
}

export interface UseDictationOptions {
  /** A running reply blocks dictation. */
  disabled: boolean;
  /** BCP 47 tag for the recognizer. */
  lang: string;
  /** Reads the field selection. Must not prompt and must not throw. */
  readSelection: () => DictationSelection | null;
  /** Changing this value ends the session. It combines the route and the new-chat counter. */
  resetKey: string;
  /** Puts the caret back after a write. */
  restoreCaret: (index: number) => void;
  setValue: (value: string) => void;
  value: string;
}

export interface UseDictationResult {
  /** True while a session holds the microphone. */
  active: boolean;
  /** `null` until the browser check has run. */
  availability: DictationAvailability | null;
  /** Ends a live session and keeps the text. Called on submit and on a manual edit. */
  cancel: () => void;
  clearError: () => void;
  /** One error per failure. The button shows a toast, then calls `clearError`. */
  error: DictationErrorCode | null;
  /** The current guess. Empty when the recognizer holds none. */
  interimText: string;
  /** True until the speech route is known. The control shows a loader. */
  pending: boolean;
  status: DictationStatus;
  toggle: () => void;
}

/** A `stop()` that never reports `onend` must not keep the control spinning. */
const FINALIZE_GUARD_MS = 1500;

/**
 * Dictation session for the chat composer.
 *
 * The session lives with the component, because the microphone must die with
 * it. Read-aloud needed a module singleton, because the reader outlives a
 * per-message render. The opposite constraint applies here.
 *
 * Text flows one way. The hook writes into the field through `setValue`, and it
 * never owns the field value. A write happens only while the field still holds
 * the text this session last emitted, so a second writer ends the session
 * instead of corrupting the insertion point.
 */
export function useDictation({
  disabled,
  resetKey,
  lang,
  readSelection,
  restoreCaret,
  setValue,
  value,
}: UseDictationOptions): UseDictationResult {
  const engine = getDictationEngine();

  const [status, setStatusState] = useState<DictationStatus>("idle");
  const [error, setError] = useState<DictationErrorCode | null>(null);
  const [interimText, setInterimText] = useState("");
  const [availability, setAvailability] = useState<DictationAvailability | null>(null);
  const [routeReady, setRouteReady] = useState(false);

  const sessionRef = useRef<DictationSession | null>(null);
  const statusRef = useRef<DictationStatus>("idle");
  const restartWindowRef = useRef<DictationRestartWindow>(createDictationRestartWindow(0));
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set when this capture received a transcript. Cleared on the next start. */
  const heardSpeechRef = useRef(false);
  /** Epoch ms of the current capture's `onstart`. */
  const captureStartedAtRef = useRef(0);
  /** True only while the browser holds the capture. False in the restart gap. */
  const captureLiveRef = useRef(false);
  /** A service drop reported before `onend`. The end handler consumes it. */
  const pendingFaultRef = useRef<"network" | null>(null);
  /** True when this session must stay on the device. Restarts keep the same mode. */
  const processLocallyRef = useRef(false);
  /** Bumped when a start is abandoned, so a late route check cannot open the mic. */
  const startTokenRef = useRef(0);
  /** Route learned before the first click. `none` never opens the microphone. */
  const routeRef = useRef<DictationRoute | null>(null);
  /** The value this session last wrote. A different field value means another writer. */
  const lastEmittedRef = useRef("");
  /**
   * The field value seen at the last write.
   *
   * `setValue` commits asynchronously, so the prop can still hold the previous
   * value when the next result arrives. Both values count as this session's
   * own, and only a third value is an external write.
   */
  const lastWrittenFromRef = useRef("");
  /** True between a write and its caret restore. The caret guard waits for it. */
  const caretPendingRef = useRef(false);
  /**
   * The live field value.
   *
   * A closure captures the value of the render that created it. A result event
   * can arrive before React re-renders, so the check must read the newest value
   * rather than the captured one.
   */
  const valueRef = useRef(value);
  valueRef.current = value;

  /** State and ref move together, so a handler never reads a stale status. */
  const setStatus = useCallback((next: DictationStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const clearFinalizeTimer = useCallback(() => {
    if (finalizeTimerRef.current !== null) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  /** Forgets the session. Every character on screen stays. */
  const forgetSession = useCallback(() => {
    clearFinalizeTimer();
    clearRestartTimer();
    captureLiveRef.current = false;
    pendingFaultRef.current = null;
    sessionRef.current = null;
    lastEmittedRef.current = "";
    lastWrittenFromRef.current = "";
    caretPendingRef.current = false;
    setInterimText("");
  }, [clearFinalizeTimer, clearRestartTimer]);

  /** Forgets the session and releases the microphone. */
  const endSession = useCallback(() => {
    startTokenRef.current += 1;
    engine.abort();
    forgetSession();
    setStatus("idle");
  }, [engine, forgetSession, setStatus]);

  const isExternalWrite = useCallback(
    (current: string) =>
      current !== lastEmittedRef.current && current !== lastWrittenFromRef.current,
    [],
  );

  /** True while the field still belongs to this session, caret included. */
  const ownsField = useCallback(
    (session: DictationSession): boolean => {
      if (isExternalWrite(valueRef.current)) {
        return false;
      }
      // A write that has not landed yet cannot be checked against the DOM.
      if (caretPendingRef.current) {
        return true;
      }
      const selection = readSelection();
      return (
        selection !== null && selection.start === session.caret && selection.end === session.caret
      );
    },
    [isExternalWrite, readSelection],
  );

  const openCapture = useCallback(
    (processLocally: boolean) => {
      const current = valueRef.current;
      const selection = readSelection();
      const start = selection?.start ?? current.length;
      const end = selection?.end ?? current.length;

      sessionRef.current = createDictationSession(current, start, end);
      lastEmittedRef.current = current;
      lastWrittenFromRef.current = current;
      caretPendingRef.current = false;
      restartWindowRef.current = createDictationRestartWindow(Date.now());
      heardSpeechRef.current = false;
      captureStartedAtRef.current = Date.now();
      captureLiveRef.current = false;
      pendingFaultRef.current = null;
      processLocallyRef.current = processLocally;
      setStatus("requesting");
      engine.start({
        continuous: true,
        interimResults: true,
        lang,
        processLocally,
      });
    },
    [engine, lang, readSelection, setStatus],
  );

  const startSession = useCallback(() => {
    const preflight = checkDictationPreflight({
      online: navigator.onLine !== false,
      secure: window.isSecureContext,
      supported: engine.isSupported(),
    });
    if (preflight === "offline") {
      setError(preflight);
      setStatus(statusForError(preflight));
      return;
    }

    const choice = routeRef.current;
    if (choice === "none") {
      setStatus("no-service");
      return;
    }
    if (choice === "local" || choice === "cloud") {
      setError(null);
      setInterimText("");
      openCapture(choice === "local");
      return;
    }

    const token = startTokenRef.current + 1;
    startTokenRef.current = token;
    setError(null);
    setInterimText("");
    setStatus("requesting");

    void resolveDictationRoute(lang).then((route) => {
      if (startTokenRef.current !== token) {
        return;
      }
      if (route === "none") {
        routeRef.current = "none";
        setStatus("no-service");
        return;
      }
      openCapture(route === "local");
    });
  }, [engine, lang, openCapture, setStatus]);

  /** Writes the composed value. Returns false when the session lost the field. */
  const applyResult = useCallback(
    (result: DictationResult): boolean => {
      const session = sessionRef.current;
      if (!session) {
        return false;
      }
      if (!ownsField(session)) {
        return false;
      }

      const written = applyDictationResult(session, result);

      lastWrittenFromRef.current = valueRef.current;
      lastEmittedRef.current = written.value;
      caretPendingRef.current = true;
      setInterimText(sessionInterimPreview(session));
      setValue(written.value);

      // The field renders the new text first, then the caret returns to the end
      // of the spoken part. Without this, a suffix drags the caret to the end.
      requestAnimationFrame(() => {
        caretPendingRef.current = false;
        if (sessionRef.current !== session) {
          return;
        }
        restoreCaret(written.caret);
      });

      return true;
    },
    [ownsField, restoreCaret, setValue],
  );

  /** Silent restart after a pause. Returns false when the field moved away. */
  const restart = useCallback((): boolean => {
    const session = sessionRef.current;
    if (!session || !ownsField(session)) {
      return false;
    }
    // The status stays `listening`, so the control does not flicker between
    // spinner and mic on every pause.
    engine.start({
      continuous: true,
      interimResults: true,
      lang,
      processLocally: processLocallyRef.current,
    });
    return true;
  }, [engine, lang, ownsField]);

  const finish = useCallback(() => {
    if (statusRef.current !== "listening") {
      return;
    }
    clearRestartTimer();
    // The recognizer already ended and the next start is still waiting. Stop
    // now, so that start never runs.
    if (!captureLiveRef.current) {
      endSession();
      return;
    }
    setStatus("finalizing");
    engine.stop();
    clearFinalizeTimer();
    finalizeTimerRef.current = setTimeout(() => {
      finalizeTimerRef.current = null;
      // No `onend` arrived. Drop the recognizer, so the microphone is free.
      endSession();
    }, FINALIZE_GUARD_MS);
  }, [clearFinalizeTimer, clearRestartTimer, endSession, engine, setStatus]);

  const cancel = useCallback(() => {
    if (!sessionRef.current) {
      return;
    }
    endSession();
  }, [endSession]);

  const toggle = useCallback(() => {
    switch (statusRef.current) {
      case "denied":
      case "finalizing":
      case "no-service":
      case "requesting":
        return;
      case "listening":
        finish();
        return;
      default:
        startSession();
    }
  }, [finish, startSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // The engine reports through these handlers. They read the session through a
  // ref, so a re-binding never loses an event.
  useEffect(() => {
    engine.setHandlers(
      createDictationEngineHandlers(
        {
          captureLive: captureLiveRef,
          captureStartedAt: captureStartedAtRef,
          heardSpeech: heardSpeechRef,
          pendingFault: pendingFaultRef,
          restartTimer: restartTimerRef,
          restartWindow: restartWindowRef,
          session: sessionRef,
          status: statusRef,
        },
        {
          applyResult,
          clearRestartTimer,
          endSession,
          forgetSession,
          restart,
          setError,
          setStatus,
        },
      ),
    );
  }, [applyResult, clearRestartTimer, endSession, engine, forgetSession, restart, setStatus]);

  // The first render matches the server, which has no recognizer.
  useEffect(() => {
    setAvailability(
      resolveDictationAvailability({
        secure: window.isSecureContext,
        supported: engine.isSupported(),
      }),
    );
  }, [engine]);

  // A slow route check keeps the loader up. No speech service leaves the mic closed.
  useEffect(() => {
    if (availability !== "available") {
      return;
    }
    let cancelled = false;
    setRouteReady(false);
    void readDictationRouteChoice(lang).then((choice) => {
      if (cancelled) {
        return;
      }
      routeRef.current = choice;
      if (choice === "none" && statusRef.current === "idle") {
        setStatus("no-service");
      }
      setRouteReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [availability, lang, setStatus]);

  // A denied permission is known before the first click, so the control shows
  // its reason from the start instead of failing under the user's finger.
  useEffect(() => {
    if (availability !== "available") {
      return;
    }
    let cancelled = false;
    void readDictationPermission().then((permission) => {
      if (cancelled || permission !== "denied") {
        return;
      }
      if (statusRef.current === "idle") {
        setStatus("denied");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [availability, setStatus]);

  // A reply starts, and the composer locks. The microphone must not survive it.
  useEffect(() => {
    if (disabled && isLiveStatus(statusRef.current)) {
      endSession();
    }
  }, [disabled, endSession]);

  // A new chat, a session switch, or a locale change ends the session. The next
  // start then uses the new language.
  //
  // A terminal status (denied, unavailable) describes the browser, not the
  // session, so it survives a reset and the user keeps its explanation.
  useEffect(() => {
    void lang;
    void resetKey;
    if (isLiveStatus(statusRef.current)) {
      endSession();
    }
  }, [endSession, lang, resetKey]);

  // A route change unmounts the composer. No capture outlives it.
  useEffect(() => {
    return () => {
      startTokenRef.current += 1;
      clearRestartTimer();
      engine.abort();
      sessionRef.current = null;
    };
  }, [clearRestartTimer, engine]);

  return {
    active: isLiveStatus(status),
    availability,
    cancel,
    clearError,
    error,
    interimText,
    pending: availability === null || (availability === "available" && !routeReady),
    status,
    toggle,
  };
}
