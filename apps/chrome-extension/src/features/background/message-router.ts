import { browser } from "wxt/browser";
import { fetchUserSettings } from "../../lib/api/domains/me";
import { AuthRequiredError, ExtensionOutdatedError } from "../../lib/api/transport";
import { extLog } from "../../lib/log";
import type {
  ExtensionMessage,
  UserSettingsResponse,
  VersionCheckResponse,
} from "../../lib/messaging/types";
import { updateActionContextIndicator } from "./badge";
import { handleEnrichError, handleEnrichPersonRequest, handleSubmitEnrichData } from "./enrich";
import { handleAuthStatus, handleLogin, handleLogout } from "./oauth";
import { handleActiveProfileContext, handleAddPerson } from "./person-cache";
import { backgroundState } from "./state";

export async function handleMessage(
  message: ExtensionMessage,
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  try {
    switch (message.type) {
      case "AUTH_STATUS_REQUEST":
        await handleAuthStatus(sendResponse);
        break;

      case "LOGIN_REQUEST":
        await handleLogin(sendResponse);
        break;

      case "LOGOUT_REQUEST":
        await handleLogout(sendResponse);
        break;

      case "ADD_PERSON_REQUEST":
        await handleAddPerson(message, sendResponse);
        break;

      case "GET_PENDING_PREVIEW":
        sendResponse({
          payload: backgroundState.pendingPreview,
          type: "PENDING_PREVIEW_RESULT",
        });
        backgroundState.pendingPreview = null;
        break;

      case "GET_ACTIVE_PROFILE_CONTEXT":
        await handleActiveProfileContext(sendResponse);
        break;

      case "OPEN_EXTENSIONS_PAGE":
        await browser.tabs.create({ url: `chrome://extensions/?id=${browser.runtime.id}` });
        sendResponse({ type: "OK" });
        break;

      case "VERSION_CHECK_REQUEST": {
        const { updateRequired = false } = await browser.storage.local.get("updateRequired");
        sendResponse({
          payload: { updateRequired },
          type: "VERSION_CHECK_RESPONSE",
        } satisfies VersionCheckResponse);
        break;
      }

      case "USER_SETTINGS_REQUEST":
        try {
          const settings = await fetchUserSettings();
          sendResponse({
            payload: settings,
            type: "USER_SETTINGS_RESPONSE",
          } satisfies UserSettingsResponse);
        } catch (error) {
          if (error instanceof AuthRequiredError) {
            sendResponse({
              payload: { error: "Authentication required", requiresAuth: true },
              type: "USER_SETTINGS_RESPONSE",
            } satisfies UserSettingsResponse);
            break;
          }
          sendResponse({
            payload: {
              error: error instanceof Error ? error.message : "Failed to load settings",
            },
            type: "USER_SETTINGS_RESPONSE",
          } satisfies UserSettingsResponse);
        }
        break;

      case "ENRICH_PERSON_REQUEST":
        await handleEnrichPersonRequest(message, sender, sendResponse);
        break;

      case "GET_ENRICH_CONTEXT":
        extLog.debug("[background][enrich] GET_ENRICH_CONTEXT", {
          pendingTabId: backgroundState.pendingEnrich?.linkedinTabId,
          requestId: backgroundState.pendingEnrich?.requestId,
          senderTabId: sender.tab?.id,
        });
        if (
          backgroundState.pendingEnrich &&
          sender.tab?.id === backgroundState.pendingEnrich.linkedinTabId
        ) {
          sendResponse({
            payload: {
              contactId: backgroundState.pendingEnrich.contactId,
              linkedinHandle: backgroundState.pendingEnrich.linkedinHandle,
              requestId: backgroundState.pendingEnrich.requestId,
            },
            type: "ENRICH_CONTEXT_RESULT",
          });
        } else {
          sendResponse({
            payload: null,
            type: "ENRICH_CONTEXT_RESULT",
          });
        }
        break;

      case "SUBMIT_ENRICH_DATA":
        await handleSubmitEnrichData(message, sender, sendResponse);
        break;

      case "ENRICH_ERROR":
        await handleEnrichError(message, sender, sendResponse);
        break;

      case "ENRICH_CONTEXT_RESULT":
        break;

      default:
        sendResponse({ payload: { error: "Unknown message type" }, type: "ERROR" });
    }
  } catch (error) {
    if (error instanceof ExtensionOutdatedError) {
      await browser.storage.local.set({ updateRequired: true });
      await updateActionContextIndicator();
      sendResponse({
        payload: { error: "Extension update required", extensionOutdated: true },
        type: "ERROR",
      });
      return;
    }

    extLog.error("[background] Message handler error:", error);
    sendResponse({
      payload: { error: error instanceof Error ? error.message : "Unknown error" },
      type: "ERROR",
    });
  }
}
