/**
 * Picks a speech route before the microphone opens.
 *
 * Chrome and Edge send audio to their own speech service. Brave exposes the
 * same API and still opens the microphone, then reports `network`, because
 * Brave has no access to that service. A retry cannot succeed.
 *
 * On-device recognition is used when a language pack is already installed.
 * Brave may install one later. Until then the control explains the limit and
 * leaves the microphone closed.
 */

export type LocalSpeechAvailability = "available" | "installable" | "unavailable";

export type DictationRoute = "local" | "install" | "cloud" | "none";

/** Availability values returned by `SpeechRecognition.available()`. */
export type SpeechPackStatus = "available" | "downloading" | "downloadable" | "unavailable";

export function classifyLocalSpeech(status: SpeechPackStatus | "timeout"): LocalSpeechAvailability {
  if (status === "available") {
    return "available";
  }
  if (status === "downloadable" || status === "downloading") {
    return "installable";
  }
  return "unavailable";
}

/**
 * Chooses cloud, on-device, a pack install, or no dictation.
 *
 * A pack that is already installed wins in every browser. A browser with no
 * speech service does not open the microphone.
 */
export function selectDictationRoute(input: {
  brave: boolean;
  local: LocalSpeechAvailability;
}): DictationRoute {
  if (input.local === "available") {
    return "local";
  }
  if (input.brave && input.local === "installable") {
    return "install";
  }
  if (input.brave) {
    return "none";
  }
  return "cloud";
}

interface SpeechRecognitionOptions {
  langs: string[];
  processLocally: boolean;
  quality: "dictation";
}

interface LocalSpeechProbe {
  available?: (options: SpeechRecognitionOptions) => Promise<SpeechPackStatus>;
  install?: (options: SpeechRecognitionOptions) => Promise<boolean>;
}

interface BraveNavigator {
  brave?: { isBrave?: () => Promise<boolean> };
}

const PROBE_TIMEOUT_MS = 3_000;
const INSTALL_TIMEOUT_MS = 8_000;

function speechOptions(lang: string): SpeechRecognitionOptions {
  return { langs: [lang], processLocally: true, quality: "dictation" };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | "timeout"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve("timeout");
      },
    );
  });
}

function readProbe(): LocalSpeechProbe | null {
  if (typeof window === "undefined") {
    return null;
  }
  const ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!ctor) {
    return null;
  }
  return ctor as LocalSpeechProbe;
}

/** True when the page is Brave. Other Chromium browsers return false. */
export async function isBraveBrowser(): Promise<boolean> {
  const brave = (navigator as Navigator & BraveNavigator).brave;
  if (!brave?.isBrave) {
    return false;
  }
  try {
    return await brave.isBrave();
  } catch {
    return false;
  }
}

/** Reads the on-device language pack. A missing API counts as unavailable. */
export async function readLocalSpeech(lang: string): Promise<LocalSpeechAvailability> {
  const probe = readProbe();
  if (!probe?.available) {
    return "unavailable";
  }
  const status = await withTimeout(probe.available(speechOptions(lang)), PROBE_TIMEOUT_MS);
  if (status === "timeout") {
    return "unavailable";
  }
  return classifyLocalSpeech(status);
}

/** Downloads the on-device pack. Returns false when the browser declines. */
export async function installLocalSpeech(lang: string): Promise<boolean> {
  const probe = readProbe();
  if (!probe?.install) {
    return false;
  }
  const installed = await withTimeout(probe.install(speechOptions(lang)), INSTALL_TIMEOUT_MS);
  return installed === true;
}

/** Reads the route without installing a language pack. */
export async function readDictationRouteChoice(lang: string): Promise<DictationRoute> {
  const [local, brave] = await Promise.all([readLocalSpeech(lang), isBraveBrowser()]);
  return selectDictationRoute({ brave, local });
}

/**
 * Resolves the route for one start.
 *
 * An install runs only when it is the sole way to dictate. A failed install
 * leaves the microphone closed.
 */
export async function resolveDictationRoute(lang: string): Promise<"local" | "cloud" | "none"> {
  const choice = await readDictationRouteChoice(lang);
  if (choice === "local" || choice === "cloud" || choice === "none") {
    return choice;
  }
  const installed = await installLocalSpeech(lang);
  return installed ? "local" : "none";
}
