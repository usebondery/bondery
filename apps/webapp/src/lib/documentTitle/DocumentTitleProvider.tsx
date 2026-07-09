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
import { useTranslation } from "react-i18next";
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
  const { i18n } = useTranslation();
  const entityTitleOverrideRef = useRef<string | null>(null);

  const translate = useCallback(
    (namespace: string, key: string) => i18n.getFixedT(namespace)(key),
    [i18n],
  );

  const resolveTitle = useCallback(
    (optimisticTitle?: string) =>
      resolveClientRouteTitle(pathname, {
        entityTitleOverride: entityTitleOverrideRef.current,
        optimisticTitle,
        queryClient,
        translate,
      }),
    [pathname, queryClient, translate],
  );

  useLayoutEffect(() => {
    entityTitleOverrideRef.current = null;
    const optimistic = peekOptimisticDocumentTitle();
    applyDocumentTitle(resolveTitle(optimistic ?? undefined));
    if (optimistic) {
      clearOptimisticDocumentTitle();
    }
  }, [resolveTitle]);

  const setEntityTitle = useCallback(
    (name: string) => {
      entityTitleOverrideRef.current = name.trim() || null;
      if (entityTitleOverrideRef.current) {
        applyDocumentTitle(resolveTitle());
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
