import { WEBAPP_ROUTES } from "@bondery/helpers";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { config } from "../../config";
import { extLog } from "../../lib/log";
import type {
  ActiveProfileContextResult,
  AddPersonResult,
  AuthStatusResponse,
  LoginResult,
  LogoutResult,
  PendingPreviewResult,
  PersonPreviewData,
  ScrapedProfileData,
  UserSettingsResponse,
  VersionCheckResponse,
} from "../../lib/messaging/types";
import { useExtensionTheme } from "../../lib/ui";
import type { MainAuthedState, PopupState, UserInfo } from "./types";
import { ImportView } from "./views/ImportView";
import { LoadingView } from "./views/LoadingView";
import { LoggedInView } from "./views/LoggedInView";
import { LoggedOutView } from "./views/LoggedOutView";
import { PreviewView } from "./views/PreviewView";
import { SettingsView } from "./views/SettingsView";
import { UpdateRequiredView } from "./views/UpdateRequiredView";

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

  const checkAuthAndPreview = useCallback(async () => {
    try {
      // Check if an update is required before proceeding
      const versionResponse: VersionCheckResponse = await browser.runtime.sendMessage({
        type: "VERSION_CHECK_REQUEST",
      });
      if (versionResponse.payload.updateRequired) {
        setState("update-required");
        return;
      }

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
        const settingsResponse: UserSettingsResponse = await browser.runtime.sendMessage({
          type: "USER_SETTINGS_REQUEST",
        });
        const settings =
          settingsResponse.type === "USER_SETTINGS_RESPONSE" &&
          settingsResponse.payload &&
          !("error" in settingsResponse.payload)
            ? settingsResponse.payload
            : null;
        if (settings?.email || fallbackUser?.email) {
          setUser({
            avatarUrl: settings?.avatarUrl,
            email: settings?.email ?? fallbackUser?.email ?? "",
            id: settings?.id ?? fallbackUser?.id ?? "",
            name: settings?.name,
          });
        } else {
          setUser(fallbackUser);
        }
      } catch (settingsError) {
        extLog.error("[popup] Failed to load user settings:", settingsError);
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
      extLog.error("[popup] Init error:", err);
      setState("logged-out");
    }
  }, []);

  useEffect(() => {
    void checkAuthAndPreview();
  }, [checkAuthAndPreview]);

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
      extLog.error("[popup] Logout error:", err);
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

  function openPersonWithAddInteraction(contactId: string) {
    browser.tabs.create({
      url: `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${contactId}?addInteraction=1`,
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
    if (!activeProfile) {
      return;
    }

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
        payload: profileToImport,
        type: "ADD_PERSON_REQUEST",
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

  if (state === "update-required") {
    return <UpdateRequiredView />;
  }

  if (state === "logged-out") {
    return <LoggedOutView error={error} loginLoading={loginLoading} onLogin={handleLogin} />;
  }

  if (state === "settings") {
    return (
      <SettingsView
        onBack={() => setState(settingsBackState)}
        onLogout={handleLogout}
        onThemeChange={handleThemeChange}
        themePreference={themePreference}
        user={user}
      />
    );
  }

  if (state === "preview" && preview) {
    return (
      <PreviewView
        onOpenPerson={openPerson}
        onOpenPersonWithAddInteraction={openPersonWithAddInteraction}
        onOpenSettings={openSettings}
        preview={preview}
      />
    );
  }

  if (state === "import" && activeProfile) {
    return (
      <ImportView
        activeProfile={activeProfile}
        error={error}
        loginLoading={loginLoading}
        onImport={handleImportActiveProfile}
        onOpenSettings={openSettings}
      />
    );
  }

  return (
    <LoggedInView
      onOpenBondery={openBondery}
      onOpenSettings={openSettings}
      showUnsupportedSiteMessage={showUnsupportedSiteMessage}
      user={user}
    />
  );
}
