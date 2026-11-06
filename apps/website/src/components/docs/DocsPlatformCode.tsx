import type { CodeBlockPlatform } from "@bondery/mantine-next";
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock";

type PlatformCodeProps = {
  /** macOS only, when it really differs from `posix`. */
  macos?: string;
  /** Extra class on the frame, for example to cap its width. */
  className?: string;
  /** Windows PowerShell command. */
  windows?: string;
  /** Shared macOS and Linux command. */
  posix?: string;
  /** Linux only, when it really differs from `posix`. */
  linux?: string;
};

/** Trims a value and treats a blank string as absent. */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Shell command that differs per desktop OS. Renders nothing when no platform resolves.
 * `posix` is the shortcut for one macOS and Linux line. `macos` and `linux` override it.
 */
export function DocsPlatformCode({ className, macos, windows, posix, linux }: PlatformCodeProps) {
  const shared = clean(posix);
  const platforms: Partial<Record<CodeBlockPlatform, string>> = {};

  const resolvedWindows = clean(windows);
  const resolvedMacos = clean(macos) ?? shared;
  const resolvedLinux = clean(linux) ?? shared;

  if (resolvedWindows) {
    platforms.windows = resolvedWindows;
  }
  if (resolvedMacos) {
    platforms.macos = resolvedMacos;
  }
  if (resolvedLinux) {
    platforms.linux = resolvedLinux;
  }

  if (Object.keys(platforms).length === 0) {
    return null;
  }

  return <DocsCodeBlock className={className} platforms={platforms} />;
}
