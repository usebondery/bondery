import type { UseOSReturnValue } from "@mantine/hooks";

type PlatformTabOsDefaults = Partial<Record<UseOSReturnValue, string>>;

interface ResolvePlatformTabInput {
  /** Value from `defaultValue`. Outranks the OS guess. */
  defaultValue?: string;
  /** Tab values in display order. */
  itemValues: readonly string[];
  /** Detected OS. `"undetermined"` on the server and on the first client render. */
  os: UseOSReturnValue;
  osDefault?: PlatformTabOsDefaults;
  /** The tab this reader clicked. Outranks every other source. */
  pickedValue?: string | null;
}

/**
 * Picks the open tab: the reader's click, then `defaultValue`, then the tab that
 * `osDefault` maps the detected OS to, then the first tab. A value that matches no
 * tab is skipped, so a stale choice never leaves the panel empty.
 *
 * `useOs` reports `"undetermined"` until the component mounts. That keeps the server
 * render and the first client render identical, so the OS guess never causes a
 * hydration mismatch.
 */
function resolvePlatformTab({
  defaultValue,
  itemValues,
  os,
  osDefault,
  pickedValue,
}: ResolvePlatformTabInput): string | null {
  const candidates = [pickedValue, defaultValue, osDefault?.[os]];

  for (const candidate of candidates) {
    if (candidate && itemValues.includes(candidate)) {
      return candidate;
    }
  }

  return itemValues[0] ?? null;
}

export { type PlatformTabOsDefaults, resolvePlatformTab };
