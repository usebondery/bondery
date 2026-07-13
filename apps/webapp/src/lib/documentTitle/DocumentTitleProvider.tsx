"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  clearOptimisticDocumentTitle,
  peekOptimisticDocumentTitle,
} from "@/lib/metadata/navigationTitleStore";
import { resolveClientRouteTitle } from "@/lib/metadata/resolveClientRouteTitle";

type DocumentTitleContextValue = {
  setEntityTitle: (name: string) => void;
};

const DocumentTitleContext = createContext<DocumentTitleContextValue | null>(null);

function applyDocumentTitle(title: string): void {
  if (title && document.title !== title) {
    document.title = title;
  }
}

export function DocumentTitleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const entityTitleOverrideRef = useRef<string | null>(null);

  const resolveTitle = useCallback(
    (optimisticTitle?: string) =>
      resolveClientRouteTitle(pathname, {
        entityTitleOverride: entityTitleOverrideRef.current,
        optimisticTitle,
        queryClient,
      }),
    [pathname, queryClient],
  );

  useLayoutEffect(() => {
    entityTitleOverrideRef.current = null;
    const optimistic = peekOptimisticDocumentTitle();
    const title = resolveTitle(optimistic ?? undefined);
    if (title) {
      applyDocumentTitle(title);
    }
    if (optimistic) {
      clearOptimisticDocumentTitle();
    }
  }, [resolveTitle]);

  const setEntityTitle = useCallback(
    (name: string) => {
      entityTitleOverrideRef.current = name.trim() || null;
      if (entityTitleOverrideRef.current) {
        const title = resolveTitle();
        if (title) {
          applyDocumentTitle(title);
        }
      }
    },
    [resolveTitle],
  );

  const contextValue = useMemo(() => ({ setEntityTitle }), [setEntityTitle]);

  return (
    <DocumentTitleContext.Provider value={contextValue}>{children}</DocumentTitleContext.Provider>
  );
}

export function useDocumentTitleContext(): DocumentTitleContextValue {
  const context = useContext(DocumentTitleContext);
  if (!context) {
    throw new Error("useDocumentTitleContext must be used within DocumentTitleProvider");
  }
  return context;
}
