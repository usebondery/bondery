import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";

type TabSearchFocusHandler = () => void;

interface TabSearchFocusContextValue {
  focusActiveTabSearch: () => void;
  registerTabSearchFocus: (id: string, handler: TabSearchFocusHandler) => void;
  unregisterTabSearchFocus: (id: string) => void;
}

const TabSearchFocusContext = createContext<TabSearchFocusContextValue | null>(null);

export function TabSearchFocusProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<Map<string, TabSearchFocusHandler>>(new Map());
  const activeHandlerIdRef = useRef<string | null>(null);

  const registerTabSearchFocus = useCallback((id: string, handler: TabSearchFocusHandler) => {
    handlersRef.current.set(id, handler);
    activeHandlerIdRef.current = id;
  }, []);

  const unregisterTabSearchFocus = useCallback((id: string) => {
    handlersRef.current.delete(id);
    if (activeHandlerIdRef.current === id) {
      activeHandlerIdRef.current = null;
      const remaining = [...handlersRef.current.keys()];
      activeHandlerIdRef.current = remaining.at(-1) ?? null;
    }
  }, []);

  const focusActiveTabSearch = useCallback(() => {
    const activeId = activeHandlerIdRef.current;
    if (!activeId) {
      return;
    }

    handlersRef.current.get(activeId)?.();
  }, []);

  const value = useMemo(
    () => ({
      focusActiveTabSearch,
      registerTabSearchFocus,
      unregisterTabSearchFocus,
    }),
    [focusActiveTabSearch, registerTabSearchFocus, unregisterTabSearchFocus],
  );

  return <TabSearchFocusContext.Provider value={value}>{children}</TabSearchFocusContext.Provider>;
}

export function useTabSearchFocusCoordinator() {
  const context = useContext(TabSearchFocusContext);

  if (!context) {
    throw new Error("useTabSearchFocusCoordinator must be used within TabSearchFocusProvider");
  }

  return context;
}

export function useRegisterTabSearchFocus(
  focus: TabSearchFocusHandler,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const registrationId = useId();
  const { registerTabSearchFocus, unregisterTabSearchFocus } = useTabSearchFocusCoordinator();
  const focusRef = useRef(focus);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    if (!enabled) {
      unregisterTabSearchFocus(registrationId);
      return;
    }

    registerTabSearchFocus(registrationId, () => {
      focusRef.current();
    });

    return () => {
      unregisterTabSearchFocus(registrationId);
    };
  }, [enabled, registrationId, registerTabSearchFocus, unregisterTabSearchFocus]);
}
