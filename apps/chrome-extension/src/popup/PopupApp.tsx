import React, { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { config } from "../config";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { useExtensionTheme } from "../shared/MantineWrapper";
import { fetchUserSettings } from "../utils/api";
import type {
  AuthStatusResponse,
  LoginResult,
  LogoutResult,
  PendingPreviewResult,
  PersonPreviewData,
  ScrapedProfileData,
  ActiveProfileContextResult,
  AddPersonResult,
} from "../utils/messages";
import type { MainAuthedState, PopupState, UserInfo } from "./types";
import { LoadingView } from "./views/LoadingView";
import { LoggedOutView } from "./views/LoggedOutView";
import { SettingsView } from "./views/SettingsView";
import { PreviewView } from "./views/PreviewView";
import { ImportView } from "./views/ImportView";
import { LoggedInView } from "./views/LoggedInView";

export default function PopupApp() {
  const { themePreference, setThemePreference } = useExtensionTheme();
  const [state, setState] = useState<PopupState>("loading");
  const [showUnsupportedSiteMessage, setShowUnsupportedSiteMessage] = useState(false);
  const [settingsBackState, setSettingsBackState] = useState<MainAuthedState>("logged-in");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [preview, setPreview] = useState<PersonPreviewData | null>(null);
  const [activeProfile, setActiveProfile] = useState<ScrapedProfileData | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndPreview();
  }, []);

  async function checkAuthAndPreview() {
    try {
      const authResponse: AuthStatusResponse = await browser.runtime.sendMessage({
        type: "AUTH_STATUS_REQUEST",
      });

      if (!authResponse.payload.isAuthenticated) {
        setShowUnsupportedSiteMessage(false);
        setState("logged-out");
        return;
      }

      const fallbackUser = authResponse.payload.user ?? null;

      try {
        const settings = await fetchUserSettings();
        if (settings.email || fallbackUser?.email) {
          setUser({
            id: settings.id ?? fallbackUser?.id ?? "",
            email: settings.email ?? fallbackUser?.email ?? "",
            name: settings.name,
            avatarUrl: settings.avatarUrl,
          });
        } else {
          setUser(fallbackUser);
        }
      } catch (settingsError) {
        console.error("[popup] Failed to load user settings:", settingsError);
        setUser(fallbackUser);
      }

      const previewResponse: PendingPreviewResult = await browser.runtime.sendMessage({
        type: "GET_PENDING_PREVIEW",
      });

      if (previewResponse.payload) {
        setShowUnsupportedSiteMessage(false);
        setPreview(previewResponse.payload);
        setState("preview");
      } else {
        const contextResponse: ActiveProfileContextResult = await browser.runtime.sendMessage({
          type: "GET_ACTIVE_PROFILE_CONTEXT",
        });

        if (contextResponse.payload.supported) {
          if (contextResponse.payload.existed && contextResponse.payload.preview) {
            setShowUnsupportedSiteMessage(false);
            setPreview(contextResponse.payload.preview);
            setState("preview");
          } else if (contextResponse.payload.profile) {
            setShowUnsupportedSiteMessage(false);
            setActiveProfile(contextResponse.payload.profile);
            setState("import");
          } else {
            setShowUnsupportedSiteMessage(false);
            setState("logged-in");
          }
        } else {
          setShowUnsupportedSiteMessage(true);
          setState("logged-in");
        }
      }
    } catch (err) {
      console.error("[popup] Init error:", err);
      setState("logged-out");
    }
  }

  async function handleLogin() {
    setLoginLoading(true);
    setError(null);

    try {
      const result: LoginResult = await browser.runtime.sendMessage({
        type: "LOGIN_REQUEST",
      });

      if (result.payload.success) {
        await checkAuthAndPreview();
      } else {
        setError(result.payload.error ?? "Login failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const result: LogoutResult = await browser.runtime.sendMessage({
        type: "LOGOUT_REQUEST",
      });

      if (result.payload.success) {
        setUser(null);
        setPreview(null);
        setActiveProfile(null);
        setShowUnsupportedSiteMessage(false);
        setState("logged-out");
      }
    } catch (err) {
      console.error("[popup] Logout error:", err);
    }
  }

  function openBondery() {
    browser.tabs.create({ url: `${config.appUrl}${WEBAPP_ROUTES.HOME}` });
    window.close();
  }

  function openPerson(contactId: string) {
    browser.tabs.create({
      url: `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${contactId}`,
    });
    window.close();
  }

  function openPersonWithAddEvent(contactId: string) {
    browser.tabs.create({
      url: `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${contactId}?addEvent=1`,
    });
    window.close();
  }

  function openSettings() {
    if (state === "logged-in" || state === "preview" || state === "import") {
      setSettingsBackState(state);
    }
    setState("settings");
  }

  async function handleThemeChange(value: string) {
    if (value === "light" || value === "dark" || value === "auto") {
      await setThemePreference(value);
    }
  }

  async function handleImportActiveProfile() {
    if (!activeProfile) return;

    setLoginLoading(true);
    setError(null);

    try {
      let profileToImport = activeProfile;

      const latestContext: ActiveProfileContextResult = await browser.runtime.sendMessage({
        type: "GET_ACTIVE_PROFILE_CONTEXT",
      });

      if (latestContext.payload.supported) {
        if (latestContext.payload.existed && latestContext.payload.preview) {
          setPreview(latestContext.payload.preview);
          setState("preview");
          return;
        }

        if (latestContext.payload.profile) {
          profileToImport = latestContext.payload.profile;
          setActiveProfile(latestContext.payload.profile);
        }
      }

      const result: AddPersonResult = await browser.runtime.sendMessage({
        type: "ADD_PERSON_REQUEST",
        payload: profileToImport,
      });

      if (result.payload.success) {
        if (result.payload.existed && result.payload.preview) {
          setPreview(result.payload.preview);
          setState("preview");
        } else {
          window.close();
        }
      } else {
        setError(result.payload.error ?? "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoginLoading(false);
    }
  }

  if (state === "loading") {
    return <LoadingView />;
  }

  if (state === "logged-out") {
    return <LoggedOutView loginLoading={loginLoading} error={error} onLogin={handleLogin} />;
  }

  if (state === "settings") {
    return (
      <SettingsView
        user={user}
        themePreference={themePreference}
        onThemeChange={handleThemeChange}
        onLogout={handleLogout}
        onBack={() => setState(settingsBackState)}
      />
    );
  }

  if (state === "preview" && preview) {
    return (
      <PreviewView
        preview={preview}
        onOpenSettings={openSettings}
        onOpenPerson={openPerson}
        onOpenPersonWithAddEvent={openPersonWithAddEvent}
      />
    );
  }

  if (state === "import" && activeProfile) {
    return (
      <ImportView
        activeProfile={activeProfile}
        loginLoading={loginLoading}
        error={error}
        onOpenSettings={openSettings}
        onImport={handleImportActiveProfile}
      />
    );
  }

  return (
    <LoggedInView
      user={user}
      showUnsupportedSiteMessage={showUnsupportedSiteMessage}
      onOpenSettings={openSettings}
      onOpenBondery={openBondery}
    />
  );
}
