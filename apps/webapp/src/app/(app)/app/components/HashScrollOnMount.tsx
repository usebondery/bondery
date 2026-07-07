"use client";

import { useEffect } from "react";

function scrollToCurrentHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    return;
  }

  const element = document.getElementById(hash);
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Scrolls to the element matching `location.hash` after client navigation.
 *
 * Next.js Link with a hash is the correct navigation primitive, but App Router
 * client transitions do not trigger native browser hash scrolling. Pair Link
 * (`scroll={false}`) with this handler on the destination page.
 */
export function HashScrollOnMount() {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToCurrentHash);
    });

    window.addEventListener("hashchange", scrollToCurrentHash);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToCurrentHash);
    };
  }, []);

  return null;
}
