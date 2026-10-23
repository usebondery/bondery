import { useNavigation } from "expo-router";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import {
  getNavigationGateSnapshot,
  setNavigationTransitioning,
  subscribeNavigationGate,
} from "./navigationGateState";

const NavigationLockContext = createContext(false);

type StackTransitionNavigation = {
  addListener: (event: "transitionEnd" | "transitionStart", callback: () => void) => () => void;
};

function NavigationTransitionListener(): null {
  const navigation = useNavigation();

  useEffect(() => {
    const stackNavigation = navigation as StackTransitionNavigation;
    const onStart = stackNavigation.addListener("transitionStart", () => {
      setNavigationTransitioning(true);
    });
    const onEnd = stackNavigation.addListener("transitionEnd", () => {
      setNavigationTransitioning(false);
    });

    return () => {
      onStart();
      onEnd();
    };
  }, [navigation]);

  return null;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const isNavigationLocked = useSyncExternalStore(
    subscribeNavigationGate,
    () => getNavigationGateSnapshot().isTransitioning,
    () => false,
  );

  return (
    <NavigationLockContext.Provider value={isNavigationLocked}>
      <NavigationTransitionListener />
      {children}
    </NavigationLockContext.Provider>
  );
}

export function useIsNavigationLocked(): boolean {
  return useContext(NavigationLockContext);
}
