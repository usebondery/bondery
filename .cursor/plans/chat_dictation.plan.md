# Chat dictation (browser speech-to-text)

Add a microphone control to the chat composer. It drives the browser `SpeechRecognition` API through a `DictationEngine` seam that mirrors the shipped read-aloud seam in `apps/webapp/src/lib/speech/`.

Dictation is browser-only and disclosed in the UI before the browser permission prompt. No vendor enters the server path.

## Decisions

1. **Interim text writes into `inputValue`.** One text source. `handleSubmit`, the Send enable check, and the send label need no change.
2. **A manual edit ends the dictation session.** Two writers into one string corrupt the anchor. The user keeps every character they typed. The next mic click resumes.
3. **The session is component-scoped, not a module singleton.** One composer exists, and the microphone must die with it. Read-aloud needed a singleton because the reader outlives a per-message render. The opposite constraint applies here.
4. **Browser-only, with a one-time in-UI disclosure** before the browser permission prompt. No Google subprocessor row: Bondery does not contract Google. Add a data-flow row to the registry instead.

## Corrections to the original design (apply these)

**C1. Do not use a functional state updater as an external-writer detector.** React requires updaters to be pure, and StrictMode double-invokes them, so an abort inside the updater fires twice and mutates the engine during render. Instead:

- `useDictation` receives `value` as an option already.
- Keep `lastEmittedRef`. In the result handler, compare `value !== lastEmittedRef.current`. When they differ, abort and return.
- Then call `setValue(composed)` plainly. No `setValue((previous) => ...)`, no widening of the `setValue` prop type.

The external-writer cases (suggested prompt, submit, reset) are still caught, one render earlier and in the right place.

**C2. Measure interim re-render cost.** Every interim result sets `inputValue` in `ChatClient`, which recomputes the `turns` map and every `ChatMessage`. Chrome emits interim results several times per second. During phase 2, check the render count. If it measures badly, apply `useDeferredValue` to the textarea value only. Record the measurement in the PR.

## Architecture

```
ChatDictateButton        presentational: icon, tooltip, aria-label per status
        |
useDictation()           session: status, restart, caret, merging, lifetime
        |
composeDictationValue()  pure: prefix + committed + interim + suffix -> value + caret
        |
DictationEngine          start / stop / abort / isSupported / setHandlers
        |
browserDictationEngine   <- swap this file later for a cloud STT adapter
```

## Engine contract

`apps/webapp/src/lib/speech/dictation/dictationEngine.ts`

```ts
export type DictationErrorCode =
  | "unsupported"
  | "insecure"
  | "not-allowed"
  | "service-not-allowed"
  | "no-microphone"
  | "microphone-busy"
  | "network"
  | "language-not-supported"
  | "service-failed";

export interface DictationResult {
  /** Final text that will not change. Several results may be joined by a space. */
  final: string;
  /** The in-progress guess. Replaced by the next event. Empty when none. */
  interim: string;
}

export interface DictationHandlers {
  onStart: () => void;
  onResult: (result: DictationResult) => void;
  /** `reason` separates a clean end (restartable) from a fatal one (not restartable). */
  onEnd: (reason: "user" | "silence" | "error" | "aborted") => void;
  onError: (code: DictationErrorCode) => void;
}

export interface DictationEngine {
  isSupported(): boolean;
  start(input: { continuous: boolean; lang: string; interimResults: boolean }): void;
  /** Finish gracefully. Let the trailing final result arrive. */
  stop(): void;
  /** Drop at once. No trailing result may arrive after this call. */
  abort(): void;
  setHandlers(handlers: DictationHandlers): void;
}

/** The whole provider swap point. */
export function getDictationEngine(): DictationEngine;
```

A cloud adapter maps `getUserMedia` errors onto the same codes (`NotAllowedError` to `not-allowed`, `NotFoundError` to `no-microphone`, `NotReadableError` to `microphone-busy`, `SecurityError` to `insecure`), fires `onStart` after both the stream and the socket open, and calls `stop()` before a provider time limit so the restart path runs.

## Browser adapter

`browserDictationEngine.ts` plus `browserDictationTypes.ts` (local DOM declarations, no new dependency).

1. Constructor: `window.SpeechRecognition ?? window.webkitSpeechRecognition`. `isSupported()` is true only when one exists.
2. Options: `continuous`, `interimResults`, `lang`, `maxAlternatives = 1`.
3. Results: walk `event.resultIndex..results.length`. Join `isFinal` transcripts into `final`. Keep the last non-final as `interim`. Emit one `onResult`.
4. Fatal flag: Chrome fires `onend` after a fatal `onerror`. Record the code so `onend` reports `reason: "error"` and no restart follows.
5. Generation counter: `abort()` increments it. Late `onresult` and `onend` compare and return.
6. Single live recognizer: `start()` aborts the previous instance first.
7. `stop()` marks finishing. `abort()` does not emit `onEnd`; the hook goes idle itself.
8. `no-speech` maps to `onEnd("silence")`, not an error.

Error mapping: `not-allowed` to `not-allowed`, `service-not-allowed` to `service-not-allowed`, `audio-capture` to `no-microphone`, `network` to `network`, `language-not-supported` to `language-not-supported`, `aborted` to `onEnd("aborted")`, everything else to `service-failed`.

## Restart policy (pure, unit-tested)

`dictationRestartPolicy.ts`. `DICTATION_RESTART_CAP = 12`, `DICTATION_RESTART_WINDOW_MS = 60_000`.

No restart on `user`, `error`, or `aborted`. No restart at the cap. A final result with text resets the window. A clean end with budget left restarts immediately and the status stays `listening`, so the button does not flicker.

## Text merging (pure, unit-tested)

`dictationText.ts`:

```ts
export interface DictationInsertion {
  prefix: string;    // field text before the insertion point, captured at session start
  committed: string; // final results accepted this session
  interim: string;   // current in-progress guess
  suffix: string;    // field text after the insertion point
}

export function composeDictationValue(input: DictationInsertion): string;
export function dictationCaretIndex(input: DictationInsertion): number;
export function capitalizeDictationText(spoken: string, precedingText: string): string;
```

Rule:

1. `spoken = committed + interim`.
2. Collapse whitespace runs to one space. Trim the left edge.
3. `sepBefore` is one space when `prefix` is non-empty, does not end with whitespace, and `spoken` is non-empty.
4. `sepAfter` is one space when `suffix` is non-empty, does not start with whitespace, and `spoken` is non-empty.
5. `value = prefix + sepBefore + spoken + sepAfter + suffix`.
6. `caret = (prefix + sepBefore + spoken).length`.
7. When `suffix` is empty, trim the right edge of `spoken`.

Text before and after the caret is never modified. No punctuation is invented. Capitalise the first letter after `.`, `!`, `?`, `…`, a newline, or the start of the field. Never lowercase.

Capture the insertion window once, at session start, from `value` plus `selectionStart` and `selectionEnd`. A selected range is replaced.

Before each write, compare the live `selectionStart` with the caret last emitted. When they differ, the user moved the caret, so abort.

## State model

`useDictation.ts`. Availability: `"available" | "unsupported" | "insecure"`. Status: `"idle" | "requesting" | "listening" | "finalizing" | "denied" | "unavailable" | "busy" | "service-off" | "failed"`.

Options: `{ disabled, resetKey, lang, readSelection, value, setValue }`.
Output: `{ availability, status, error, interimText, toggle, cancel, clearError }`.

Transitions:

| From | Event | To | Side effects |
|---|---|---|---|
| idle | click or hotkey | requesting | Capture window, `engine.start` |
| requesting | `onStart` | listening | Empty the restart window |
| requesting | error `not-allowed` | denied | One toast, sticky |
| requesting | error `no-microphone` | unavailable | One toast, click retries |
| requesting | error `network` | failed | One toast |
| requesting | error `language-not-supported` | idle | One toast, control stays enabled |
| listening | `onResult` with text | listening | Compose, guarded write, restore caret |
| listening | `onEnd("silence")` and restart allowed | requesting | Silent restart |
| listening | `onEnd("silence")` at cap | failed | One toast |
| listening | `onEnd("error")` | error status | No restart |
| listening | click, hotkey | finalizing | `engine.stop` |
| finalizing | `onResult` final | finalizing | Compose and write |
| finalizing | `onEnd` | idle | Clear session |
| finalizing | 1500 ms no `onEnd` | idle | `engine.abort` |
| listening or finalizing | submit | idle | `engine.abort`, keep on-screen text |
| listening | manual edit | idle | `engine.abort`, keep typed text |
| any active | `disabled` true | idle | `engine.abort` |
| any active | `resetKey` changes | idle | `engine.abort` |
| any active | `lang` changes | idle | `engine.abort` |
| any active | unmount | idle | `engine.abort` in cleanup |
| denied / unavailable / busy / service-off / failed | click | requesting | Retry |

## UX

Footer structure:

```
Group justify="space-between" wrap="nowrap" mt={4}
├── ChatModelPicker
└── Group gap={4} wrap="nowrap"
    ├── ChatDictateButton   (hidden when unsupported)
    └── Send / Stop
```

Dictation and Send produce the message, so they sit together. A mic on the left would read as a setting.

`ActionIconButton` inside a `Tooltip`, `size="md"`, `radius="xl"`, `className="no-scale"`, matching Send.

| State | Icon | Tooltip key |
|---|---|---|
| idle | `IconMicrophone` | `dictateStart` |
| requesting | `IconLoader` `animate-spin`, disabled | `dictateRequesting` |
| listening | `IconMicrophoneFilled` in a pulsing Box, `variant="light"` | `dictateStop` |
| finalizing | `IconLoader` `animate-spin`, disabled | `dictateFinishing` |
| denied | `IconMicrophoneOff`, disabled | `dictateDenied` |
| unavailable | `IconMicrophoneOff`, disabled | `dictateNoMicrophone` |
| busy | `IconMicrophoneOff`, disabled | `dictateBusy` |
| service-off | `IconMicrophoneOff`, disabled | `dictateServiceOff` |
| failed | `IconMicrophone` | `dictateFailed` |
| insecure | `IconMicrophoneOff`, disabled | `dictateInsecure` |
| unsupported | not rendered | — |

Disabled uses `aria-disabled` plus `onClick={undefined}`, because a `disabled` button fires no pointer events and the tooltip never shows. `ChatMessageSpeakButton.tsx` already uses this pattern.

Unsupported is hidden. A disabled control implies the user can enable it. Insecure, denied, busy, and unavailable are disabled with a reason, because the user can act on them.

Listening indicator: the filled mic inside `<Box className="animate-pulse motion-reduce:animate-none">`. Tailwind is imported in `apps/webapp/src/app/globals.css`, so no CSS file and no dependency. `animate-pulse` animates opacity, which is GPU-composited. Do not animate scale on the SVG.

The footer is a sibling of the textarea, so the button never sits under text and never changes height as the field grows.

Permission flow:

1. On mount, `readDictationPermissionIfGranted()` mirrors `readMapGeolocationIfGranted()` in `apps/webapp/src/components/map/useMapGeolocation.ts`. It calls `navigator.permissions.query({ name: "microphone" })` in a `try` and returns `"granted" | "denied" | "prompt" | null`. It never prompts. `null` is a normal result.
2. `denied` renders the denied state up front, so the user never clicks a dead control.
3. First click, when `localStorage["bondery.dictationIntro:v1"]` is unset, shows `ChatDictationIntro`: one strip inside the bordered box, under the textarea, above the footer. Actions `dictateIntroAllow` (starts the session) and `dictateIntroDismiss`. Write the key on either action.
4. The browser prompt appears after the disclosure, never before.

Keyboard: add `HOTKEYS.DICTATE = "mod+shift+m"` to `apps/webapp/src/lib/platform/config.ts`. Handle it in the existing textarea `onKeyDown`, not `useHotkeys`, which ignores inputs. Guard with `event.nativeEvent.isComposing` and `event.nativeEvent.repeat`. Do not bind Escape; Escape keeps stopping a running reply.

Translation keys, in `en`, `cs`, and `de`:

| Key | English |
|---|---|
| `dictateStart` | Dictate |
| `dictateStop` | Stop dictation |
| `dictateRequesting` | Waiting for microphone access |
| `dictateFinishing` | Finishing |
| `dictateDenied` | Microphone access is blocked. Allow it in your browser settings. |
| `dictateNoMicrophone` | No microphone found |
| `dictateBusy` | Another app is using the microphone |
| `dictateInsecure` | Dictation needs a secure connection |
| `dictateServiceOff` | Dictation is turned off in this browser |
| `dictateLanguageUnsupported` | This language is not available for dictation |
| `dictateNetwork` | The speech service is unreachable. Check your connection. |
| `dictateFailed` | Dictation stopped. Try again. |
| `dictateIntroTitle` | Use your voice |
| `dictateIntroBody` | Your browser transcribes your speech. It may send the audio to its speech service. Bondery does not receive the audio. |
| `dictateIntroAllow` | Allow microphone |
| `dictateIntroDismiss` | Not now |

`dictateIntroBody` is a privacy statement. Word it conservatively. Do not claim on-device processing and do not claim off-device processing.

## Edge cases

| Event | Behaviour |
|---|---|
| No constructor | Control not rendered |
| Insecure origin | Disabled, reason tooltip |
| First click, intro unseen | Disclosure strip, then browser prompt |
| Permission denied | One toast, sticky denied, click retries |
| No microphone | Toast, unavailable, click retries |
| Microphone busy | Toast, busy, click retries |
| Speech service off | Toast, service-off, click retries |
| Language unsupported | Toast, back to idle, control enabled |
| Short silence | Silent restart |
| Restart loop | Stop at the cap, toast, failed |
| Fatal error | No restart |
| User types during dictation | Session ends, typed text kept |
| Caret moved during dictation | Session ends before the next write |
| Send while listening | Abort, on-screen text sent, field clears |
| Suggested prompt clicked | External write detected, abort, prompt text kept |
| New chat, session switch | `resetKey` changes, abort |
| Reply stream starts | `disabled` turns true, abort |
| Quota reached | Composer replaced, unmount aborts |
| Route change | Abort, no capture outlives the composer |
| Locale changed mid-session | Abort, next start uses the new language |
| `stop()` with no `onEnd` | 1500 ms guard aborts |
| Late result after abort | Dropped by the generation guard |
| Different language than UI | Accuracy degrades, no in-session switch |
| Reduced motion | No pulse, static filled mic |
| Double click on mic | Ignored, disabled during requesting |
| Long dictation | Grows to 8 rows, then scrolls |

## Files

Create:

- `docs/adr/0015-chat-dictation.mdx`
- `apps/webapp/src/lib/speech/dictation/dictationEngine.ts`
- `apps/webapp/src/lib/speech/dictation/browserDictationEngine.ts`
- `apps/webapp/src/lib/speech/dictation/browserDictationTypes.ts`
- `apps/webapp/src/lib/speech/dictation/dictationAvailability.ts`
- `apps/webapp/src/lib/speech/dictation/dictationLanguage.ts`
- `apps/webapp/src/lib/speech/dictation/dictationPermission.ts`
- `apps/webapp/src/lib/speech/dictation/dictationRestartPolicy.ts`
- `apps/webapp/src/lib/speech/dictation/dictationText.ts`
- `apps/webapp/src/lib/speech/dictation/dictationIntroPreference.ts`
- `apps/webapp/src/lib/speech/dictation/useDictation.ts`
- `apps/webapp/src/lib/speech/dictation/dictationText.test.ts`
- `apps/webapp/src/lib/speech/dictation/dictationLanguage.test.ts`
- `apps/webapp/src/lib/speech/dictation/dictationAvailability.test.ts`
- `apps/webapp/src/lib/speech/dictation/dictationRestartPolicy.test.ts`
- `apps/webapp/src/app/(app)/app/(shell)/chat/components/composer/ChatDictateButton.tsx`
- `apps/webapp/src/app/(app)/app/(shell)/chat/components/composer/ChatDictationIntro.tsx`

Edit:

- `ChatComposer.tsx` — right footer cluster, hook call, submit wrapper, textarea `onChange` and `onKeyDown`, intro strip.
- `ChatClient.tsx` — pass `dictationResetKey={`${routeSessionId ?? "new"}:${chatResetKey}`}`.
- `apps/webapp/src/lib/platform/config.ts` — `HOTKEYS.DICTATE`.
- `packages/translations/src/locales/{en,cs,de}/features/pages/ChatPage.json`
- `apps/webapp/package.json` — extend `test:speech` to `tsx --test src/lib/speech/*.test.ts src/lib/speech/dictation/*.test.ts`.
- `docs/changelog/unreleased.mdx` — one Added entry.
- `.agents/skills/bondery-legal/references/subprocessor-registry.md` — one data-flow row: flow `Browser speech recognition`, data `microphone audio, transcript held only in the composer`, pointer `browserDictationEngine.ts`, note `Bondery does not receive the audio`.

Do not edit `apps/website/src/components/legal/Privacy.tsx`.

## Testing

Unit tested: `dictationText` (compose, caret, separators, selection, interim replacement, capitalisation, never lowercase), `dictationRestartPolicy`, `dictationLanguage`, `dictationAvailability`.

Not tested in CI: the browser adapter, `useDictation`, and composer wiring. They need a real recognizer, a real permission prompt, and a real microphone. A Playwright stub would test a fake and give false confidence. Do not add an E2E spec. Say this in the PR.

Gates: `pnpm --filter webapp run test:speech`, `pnpm --filter webapp run check:types`, `pnpm run check:i18n`, `pnpm build -w @bondery/translations` (root `build` forwards to turbo, which rejects `-w`), `pnpm exec biome ci`.
