"use client";

import type { ColorSchemePreference } from "@bondery/schemas";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

export interface UserSessionState {
  applyUserSession: (
    patch: Partial<Pick<UserSessionState, "avatarUrl" | "colorScheme" | "displayName">>,
  ) => void;
  avatarUrl: string | null;
  colorScheme: ColorSchemePreference;
  displayName: string;
}

const UserSessionContext = createContext<UserSessionState | null>(null);

/** Module ref for refreshAppShell() to patch session without hook context. */
let applyUserSessionRef: UserSessionState["applyUserSession"] | null = null;

export function applyUserSessionFromRef(
  patch: Partial<Pick<UserSessionState, "avatarUrl" | "colorScheme" | "displayName">>,
): void {
  applyUserSessionRef?.(patch);
}

export function useUserSession(): UserSessionState {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error("useUserSession must be used within UserSessionProvider");
  }
  return context;
}

interface UserSessionProviderProps {
  avatarUrl: string | null;
  children: ReactNode;
  colorScheme: ColorSchemePreference;
  displayName: string;
}

export function UserSessionProvider({
  children,
  displayName: initialDisplayName,
  avatarUrl: initialAvatarUrl,
  colorScheme: initialColorScheme,
}: UserSessionProviderProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [colorScheme, setColorScheme] = useState(initialColorScheme);

  // New server props replace the local copy. Adjusting during render avoids the extra
  // render pass that an effect would add.
  const [serverSession, setServerSession] = useState({
    avatarUrl: initialAvatarUrl,
    colorScheme: initialColorScheme,
    displayName: initialDisplayName,
  });
  if (
    serverSession.avatarUrl !== initialAvatarUrl ||
    serverSession.colorScheme !== initialColorScheme ||
    serverSession.displayName !== initialDisplayName
  ) {
    setServerSession({
      avatarUrl: initialAvatarUrl,
      colorScheme: initialColorScheme,
      displayName: initialDisplayName,
    });
    setDisplayName(initialDisplayName);
    setAvatarUrl(initialAvatarUrl);
    setColorScheme(initialColorScheme);
  }

  const applyUserSession = useCallback(
    (patch: Partial<Pick<UserSessionState, "avatarUrl" | "colorScheme" | "displayName">>) => {
      if (patch.displayName !== undefined) {
        setDisplayName(patch.displayName);
      }
      if (patch.avatarUrl !== undefined) {
        setAvatarUrl(patch.avatarUrl);
      }
      if (patch.colorScheme !== undefined) {
        setColorScheme(patch.colorScheme);
      }
    },
    [],
  );

  useEffect(() => {
    applyUserSessionRef = applyUserSession;
    return () => {
      applyUserSessionRef = null;
    };
  }, [applyUserSession]);

  return (
    <UserSessionContext.Provider value={{ applyUserSession, avatarUrl, colorScheme, displayName }}>
      {children}
    </UserSessionContext.Provider>
  );
}
