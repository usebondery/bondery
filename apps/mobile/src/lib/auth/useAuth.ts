import type { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthContextValue = {
  session: Session | null;
  isLoadingSession: boolean;
  isAuthenticated: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
