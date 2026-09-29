"use client";

import { ScrollArea } from "@mantine/core";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Settings (and any hashed page) may paint the target after the route effect. */
const HASH_TARGET_RETRY_MS = 2000;

interface AppShellMainScrollAreaProps {
  children: React.ReactNode;
  scrollLocked?: boolean;
}

/**
 * Scroll the shell viewport for the current location: top when there is no
 * hash, otherwise the matching id. Returns false if a hash is set but the
 * node is not in the DOM yet.
 */
function applyShellLocationScroll(viewport: HTMLDivElement, behavior: ScrollBehavior): boolean {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    viewport.scrollTo({ top: 0 });
    return true;
  }
  const target = document.getElementById(hash);
  if (!target) {
    return false;
  }
  target.scrollIntoView({ behavior, block: "start" });
  return true;
}

/**
 * Sole page scroller for `(shell)` routes. html/body overflow is locked in
 * AppShellWrapper so chromeless / login / OAuth keep native document scroll.
 * AppShell padding is 0 so the thumb sits on the viewport edge; `md` is on
 * the ScrollArea content so pages can grow and the scroller actually overflows.
 */
export function AppShellMainScrollArea({
  children,
  scrollLocked = false,
}: AppShellMainScrollAreaProps) {
  const pathname = usePathname();
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!pathname || !viewport) {
      return;
    }

    let cancelled = false;
    let frame = 0;
    let deadline = 0;

    const attempt = (behavior: ScrollBehavior) => {
      if (cancelled) {
        return;
      }
      if (applyShellLocationScroll(viewport, behavior) || performance.now() >= deadline) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        attempt(behavior);
      });
    };

    const start = (behavior: ScrollBehavior) => {
      window.cancelAnimationFrame(frame);
      deadline = performance.now() + HASH_TARGET_RETRY_MS;
      frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          attempt(behavior);
        });
      });
    };

    start("auto");
    const onHashChange = () => {
      start("smooth");
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname]);

  return (
    <ScrollArea
      h="100%"
      offsetScrollbars={false}
      overscrollBehavior="contain"
      scrollbars="y"
      styles={{
        content: {
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          padding: "var(--mantine-spacing-md)",
        },
        root: {
          flex: 1,
          minHeight: 0,
        },
        viewport: {
          height: "100%",
          ...(scrollLocked ? { overflow: "hidden" } : {}),
        },
      }}
      type="auto"
      viewportRef={viewportRef}
    >
      {children}
    </ScrollArea>
  );
}
