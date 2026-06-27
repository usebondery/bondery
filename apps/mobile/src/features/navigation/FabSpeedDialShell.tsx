import type { ReactNode } from "react";
import { FabSpeedDialProvider } from "./fabSpeedDialContext";
import { useRootFabSpeedDialActions } from "./useRootFabSpeedDialActions";

export function FabSpeedDialShell({ children }: { children: ReactNode }) {
  const actions = useRootFabSpeedDialActions();

  return <FabSpeedDialProvider actions={actions}>{children}</FabSpeedDialProvider>;
}
