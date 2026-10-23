import type { ReactNode } from "react";
import { authClient } from "./client";
import { AuthContext, type AuthContextValue } from "./useAuth";
import { useAuthSession } from "./useAuthSession";

type AuthProviderProps = {
  children: ReactNode;
};

function AuthProviderWithClient({ children }: AuthProviderProps) {
  const sessionState = useAuthSession();

  const session = sessionState.data ?? null;
  const isSessionHydrating = sessionState.isPending && session === null;
  const isLoadingSession = isSessionHydrating;

  const value: AuthContextValue = {
    isAuthenticated: session !== null,
    isLoadingSession,
    isSessionHydrating,
    session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AuthProviderWithoutClient({ children }: AuthProviderProps) {
  const value: AuthContextValue = {
    isAuthenticated: false,
    isLoadingSession: false,
    isSessionHydrating: false,
    session: null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: AuthProviderProps) {
  if (!authClient) {
    return <AuthProviderWithoutClient>{children}</AuthProviderWithoutClient>;
  }

  return <AuthProviderWithClient>{children}</AuthProviderWithClient>;
}
