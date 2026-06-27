import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as SplashScreen from "expo-splash-screen";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import { AuthContext, type AuthContextValue } from "./useAuth";

SplashScreen.preventAutoHideAsync().catch(() => {});

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setIsLoadingSession(false);
      return;
    }

    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      let nextSession = data.session ?? null;

      if (nextSession) {
        const { error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut({ scope: "local" });
          nextSession = null;
        }
      }

      if (!active) {
        return;
      }

      setSession(nextSession);
      setIsLoadingSession(false);

      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
        if (!active) {
          return;
        }

        setSession(updatedSession);
      });
      subscription = authSubscription;
    })();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoadingSession) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoadingSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoadingSession,
      isAuthenticated: !isLoadingSession && session !== null,
    }),
    [isLoadingSession, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
