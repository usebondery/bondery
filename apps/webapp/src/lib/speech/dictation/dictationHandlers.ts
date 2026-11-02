import type { MutableRefObject } from "react";
import type {
  DictationEndReason,
  DictationErrorCode,
  DictationHandlers,
  DictationResult,
} from "@/lib/speech/dictation/dictationEngine";
import {
  createDictationRestartWindow,
  type DictationRestartWindow,
  decideDictationRestart,
} from "@/lib/speech/dictation/dictationRestartPolicy";
import type { DictationSession } from "@/lib/speech/dictation/dictationSession";

export type DictationStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "finalizing"
  | "denied"
  | "unavailable"
  | "busy"
  | "offline"
  | "service-off"
  | "no-service"
  | "failed";

/** Statuses that hold the microphone open. Only these need a teardown. */
export function isLiveStatus(status: DictationStatus): boolean {
  return status === "requesting" || status === "listening" || status === "finalizing";
}

/** Maps an engine error onto the sticky status that explains it. */
export function statusForError(code: DictationErrorCode): DictationStatus {
  switch (code) {
    case "not-allowed":
      return "denied";
    case "no-microphone":
    case "unsupported":
    case "insecure":
      return "unavailable";
    case "offline":
      return "offline";
    case "microphone-busy":
      return "busy";
    case "no-service":
      return "no-service";
    case "service-not-allowed":
      return "service-off";
    case "network":
    case "service-failed":
      return "failed";
    case "language-not-supported":
      return "idle";
  }
}

export interface DictationHandlerRefs {
  captureLive: MutableRefObject<boolean>;
  captureStartedAt: MutableRefObject<number>;
  heardSpeech: MutableRefObject<boolean>;
  pendingFault: MutableRefObject<"network" | null>;
  restartTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  restartWindow: MutableRefObject<DictationRestartWindow>;
  session: MutableRefObject<DictationSession | null>;
  status: MutableRefObject<DictationStatus>;
}

export interface DictationHandlerActions {
  applyResult: (result: DictationResult) => boolean;
  clearRestartTimer: () => void;
  endSession: () => void;
  forgetSession: () => void;
  restart: () => boolean;
  setError: (code: DictationErrorCode | null) => void;
  setStatus: (status: DictationStatus) => void;
}

/**
 * Engine callbacks for one composer session.
 *
 * A network error only records a fault. The restart runs from `onend`, after
 * the browser releases the capture.
 */
export function createDictationEngineHandlers(
  refs: DictationHandlerRefs,
  actions: DictationHandlerActions,
): DictationHandlers {
  const scheduleRestart = (delayMs: number) => {
    actions.clearRestartTimer();
    refs.restartTimer.current = setTimeout(() => {
      refs.restartTimer.current = null;
      if (!refs.session.current || !isLiveStatus(refs.status.current)) {
        return;
      }
      if (!actions.restart()) {
        actions.endSession();
      }
    }, delayMs);
  };

  return {
    onEnd: (reason: DictationEndReason) => {
      if (!refs.session.current) {
        return;
      }

      refs.captureLive.current = false;
      const fault = refs.pendingFault.current;
      refs.pendingFault.current = null;

      if (reason !== "silence") {
        actions.forgetSession();
        actions.setStatus("idle");
        return;
      }

      const decision = decideDictationRestart({
        elapsedMs: Date.now() - refs.captureStartedAt.current,
        heardSpeech: refs.heardSpeech.current,
        now: Date.now(),
        reason: fault ?? reason,
        window: refs.restartWindow.current,
      });
      refs.restartWindow.current = decision.window;

      if (decision.type === "fail") {
        actions.setError(decision.error);
        actions.endSession();
        return;
      }
      if (decision.type === "stop") {
        actions.forgetSession();
        actions.setStatus("idle");
        return;
      }
      scheduleRestart(decision.delayMs);
    },

    onError: (code: DictationErrorCode) => {
      if (!refs.session.current) {
        return;
      }

      if (code === "network") {
        // `onend` owns the restart. Starting here aborts the capture in a loop.
        refs.pendingFault.current = "network";
        return;
      }

      actions.setError(code);
      const nextStatus = statusForError(code);
      if (nextStatus === "idle") {
        // The language is wrong, but the control stays usable.
        actions.endSession();
        return;
      }
      actions.forgetSession();
      actions.setStatus(nextStatus);
    },

    onResult: (result: DictationResult) => {
      if (!refs.session.current) {
        return;
      }
      if (refs.status.current !== "listening" && refs.status.current !== "finalizing") {
        return;
      }
      // A transcript proves the service. The fault budget starts over.
      refs.heardSpeech.current = true;
      refs.restartWindow.current = createDictationRestartWindow(Date.now());
      if (!actions.applyResult(result)) {
        actions.endSession();
      }
    },

    onStart: () => {
      if (!refs.session.current) {
        return;
      }
      refs.captureLive.current = true;
      refs.heardSpeech.current = false;
      refs.captureStartedAt.current = Date.now();
      actions.setStatus("listening");
    },
  };
}
