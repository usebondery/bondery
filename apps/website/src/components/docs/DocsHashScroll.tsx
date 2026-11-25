"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function hashId(): string | null {
  const { hash } = window.location;
  if (hash.length < 2) {
    return null;
  }

  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
}

function scrollToHash() {
  const id = hashId();
  if (!id) {
    return;
  }

  const element = document.querySelector(`#${CSS.escape(id)}`);
  if (!element) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

export function DocsHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    function onHashChange() {
      if (window.location.pathname !== pathname) {
        return;
      }

      scrollToHash();
    }

    scrollToHash();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname]);

  return null;
}
