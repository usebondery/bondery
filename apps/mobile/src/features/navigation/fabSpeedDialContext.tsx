import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { FAB_SPEED_DIAL_MOTION } from "../../theme/animations";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import type { FabSpeedDialAction, FabSpeedDialMenuItemLayout } from "./fabSpeedDialTypes";

interface FabSpeedDialContextValue {
  actions: FabSpeedDialAction[];
  closeMenu: () => void;
  closeOverflowSheet: () => void;
  getMenuItemLayouts: () => FabSpeedDialMenuItemLayout[];
  highlightedActionId: string | null;
  isOpen: boolean;
  isOverflowSheetOpen: boolean;
  notifyScrolled: () => void;
  openMenu: () => void;
  openOverflowSheet: () => void;
  registerMenuItemLayout: (layout: FabSpeedDialMenuItemLayout) => void;
  runAction: (id: string) => void;
  setHighlightedActionId: (id: string | null) => void;
  toggleMenu: () => void;
  tryDismissFromScrim: () => void;
  usesInlineMenu: boolean;
}

const FabSpeedDialContext = createContext<FabSpeedDialContextValue | null>(null);

interface FabSpeedDialProviderProps {
  actions: FabSpeedDialAction[];
  children: ReactNode;
}

export function FabSpeedDialProvider({ actions, children }: FabSpeedDialProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOverflowSheetOpen, setIsOverflowSheetOpen] = useState(false);
  const [highlightedActionId, setHighlightedActionIdState] = useState<string | null>(null);
  const menuItemLayoutsRef = useRef<FabSpeedDialMenuItemLayout[]>([]);
  const openedAtRef = useRef(0);

  const usesInlineMenu =
    actions.length > 0 && actions.length <= MOBILE_LAYOUT.floatingTabBar.speedDialMaxInlineItems;

  const clearMenuItemLayouts = useCallback(() => {
    menuItemLayoutsRef.current = [];
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setHighlightedActionIdState(null);
    clearMenuItemLayouts();
  }, [clearMenuItemLayouts]);

  const closeOverflowSheet = useCallback(() => {
    setIsOverflowSheetOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    if (!usesInlineMenu) {
      setIsOverflowSheetOpen(true);
      return;
    }

    openedAtRef.current = Date.now();
    setIsOpen(true);
  }, [usesInlineMenu]);

  const toggleMenu = useCallback(() => {
    if (isOpen || isOverflowSheetOpen) {
      closeMenu();
      closeOverflowSheet();
      return;
    }

    openMenu();
  }, [closeMenu, closeOverflowSheet, isOpen, isOverflowSheetOpen, openMenu]);

  const openOverflowSheet = useCallback(() => {
    setIsOverflowSheetOpen(true);
  }, []);

  const setHighlightedActionId = useCallback((id: string | null) => {
    setHighlightedActionIdState((previous) => (previous === id ? previous : id));
  }, []);

  const getMenuItemLayouts = useCallback(() => menuItemLayoutsRef.current, []);

  const registerMenuItemLayout = useCallback((layout: FabSpeedDialMenuItemLayout) => {
    const layouts = menuItemLayoutsRef.current;
    const existingIndex = layouts.findIndex((item) => item.id === layout.id);
    const existing = existingIndex >= 0 ? layouts[existingIndex] : null;

    if (
      existing &&
      existing.x === layout.x &&
      existing.y === layout.y &&
      existing.width === layout.width &&
      existing.height === layout.height
    ) {
      return;
    }

    const nextLayouts = [...layouts];
    if (existingIndex >= 0) {
      nextLayouts[existingIndex] = layout;
    } else {
      nextLayouts.push(layout);
    }

    menuItemLayoutsRef.current = nextLayouts;
  }, []);

  const runAction = useCallback(
    (id: string) => {
      const action = actions.find((item) => item.id === id);
      if (!action) {
        return;
      }

      closeMenu();
      closeOverflowSheet();
      action.onPress();
    },
    [actions, closeMenu, closeOverflowSheet],
  );

  const notifyScrolled = useCallback(() => {
    if (isOpen) {
      closeMenu();
    }
  }, [closeMenu, isOpen]);

  const tryDismissFromScrim = useCallback(() => {
    const now = Date.now();
    if (now - openedAtRef.current < FAB_SPEED_DIAL_MOTION.openGuardMs) {
      return;
    }

    closeMenu();
  }, [closeMenu]);

  const value = useMemo(
    () => ({
      actions,
      closeMenu,
      closeOverflowSheet,
      getMenuItemLayouts,
      highlightedActionId,
      isOpen,
      isOverflowSheetOpen,
      notifyScrolled,
      openMenu,
      openOverflowSheet,
      registerMenuItemLayout,
      runAction,
      setHighlightedActionId,
      toggleMenu,
      tryDismissFromScrim,
      usesInlineMenu,
    }),
    [
      actions,
      closeMenu,
      closeOverflowSheet,
      highlightedActionId,
      getMenuItemLayouts,
      isOpen,
      isOverflowSheetOpen,
      notifyScrolled,
      openMenu,
      openOverflowSheet,
      registerMenuItemLayout,
      runAction,
      toggleMenu,
      tryDismissFromScrim,
      usesInlineMenu,
      setHighlightedActionId,
    ],
  );

  return <FabSpeedDialContext.Provider value={value}>{children}</FabSpeedDialContext.Provider>;
}

export function useFabSpeedDial() {
  const context = useContext(FabSpeedDialContext);

  if (!context) {
    throw new Error("useFabSpeedDial must be used within FabSpeedDialProvider");
  }

  return context;
}
