import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface TabBarPropsContextValue {
  syncTabBarProps: (props: BottomTabBarProps) => void;
  tabBarProps: BottomTabBarProps | null;
  tabBarRevision: number;
}

const TabBarPropsContext = createContext<TabBarPropsContextValue | null>(null);

function getFocusedRouteKey(props: BottomTabBarProps): string | undefined {
  return props.state.routes[props.state.index]?.key;
}

export function TabBarPropsProvider({ children }: { children: ReactNode }) {
  const tabBarPropsRef = useRef<BottomTabBarProps | null>(null);
  const [tabBarRevision, setTabBarRevision] = useState(0);

  const syncTabBarProps = useCallback((props: BottomTabBarProps) => {
    const previous = tabBarPropsRef.current;
    tabBarPropsRef.current = props;

    const focusChanged =
      getFocusedRouteKey(props) !== (previous ? getFocusedRouteKey(previous) : undefined);
    const routeCountChanged = previous?.state.routes.length !== props.state.routes.length;

    if (!previous || focusChanged || routeCountChanged) {
      setTabBarRevision((value) => value + 1);
    }
  }, []);

  const value = useMemo(
    () => ({
      syncTabBarProps,
      tabBarProps: tabBarPropsRef.current,
      tabBarRevision,
    }),
    [syncTabBarProps, tabBarRevision],
  );

  return <TabBarPropsContext.Provider value={value}>{children}</TabBarPropsContext.Provider>;
}

/** Mounted from the Tabs `tabBar` slot — syncs navigation props to the external chrome layer. */
export function TabBarPropsSync(props: BottomTabBarProps) {
  const context = useContext(TabBarPropsContext);

  useLayoutEffect(() => {
    context?.syncTabBarProps(props);
  }, [context, props, props.state.index, props.state.routes.length]);

  return null;
}

export function useTabBarProps() {
  const context = useContext(TabBarPropsContext);

  if (!context) {
    throw new Error("useTabBarProps must be used within TabBarPropsProvider");
  }

  // Re-render chrome when the focused tab changes.
  void context.tabBarRevision;

  return context.tabBarProps;
}
