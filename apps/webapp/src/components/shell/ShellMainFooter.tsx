"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";

const ShellMainFooterNodeContext = createContext<HTMLDivElement | null>(null);
const ShellMainFooterSetNodeContext = createContext<(node: HTMLDivElement | null) => void>(
  () => {},
);

export function ShellMainFooterProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  return (
    <ShellMainFooterSetNodeContext.Provider value={setNode}>
      <ShellMainFooterNodeContext.Provider value={node}>
        {children}
      </ShellMainFooterNodeContext.Provider>
    </ShellMainFooterSetNodeContext.Provider>
  );
}

/** Sibling of AppShellMainScrollArea — outside the page scroller so it stays put. */
export function ShellMainFooterHost() {
  const setNode = useContext(ShellMainFooterSetNodeContext);
  return <div ref={setNode} style={{ flexShrink: 0 }} />;
}

export function ShellMainFooter({ children }: { children: ReactNode }) {
  const node = useContext(ShellMainFooterNodeContext);
  if (!node) {
    return null;
  }
  return createPortal(children, node);
}
