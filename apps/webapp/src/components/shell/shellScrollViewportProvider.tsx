"use client";

import { createContext, type ReactNode, useContext } from "react";

const ShellScrollViewportContext = createContext<HTMLDivElement | null>(null);

export function ShellScrollViewportProvider({
  children,
  viewport,
}: {
  children: ReactNode;
  viewport: HTMLDivElement | null;
}) {
  return (
    <ShellScrollViewportContext.Provider value={viewport}>
      {children}
    </ShellScrollViewportContext.Provider>
  );
}

/** Shell page scroller element. `null` until `AppShellMainScrollArea` mounts the viewport. */
export function useShellScrollViewport(): HTMLDivElement | null {
  return useContext(ShellScrollViewportContext);
}
