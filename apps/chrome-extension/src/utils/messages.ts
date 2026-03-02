/**
 * Extension Message Protocol
 *
 * Typed message definitions for communication between:
 * - Content scripts ↔ Service Worker
 * - Popup ↔ Service Worker
 */

// ─── Payloads ────────────────────────────────────────────────────────────────

/** Profile data scraped from social media by content scripts */
export interface ScrapedProfileData {
  platform: "instagram" | "linkedin" | "facebook";
  handle: string;
  displayName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImageUrl?: string;
  headline?: string;
  place?: string;
  notes?: string;
}

/** Person preview for the "already exists" popup */
export interface PersonPreviewData {
  contactId: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  platform: string;
  handle: string;
}

// ─── Message Types ───────────────────────────────────────────────────────────

/** Content script → Service worker: add this person to Bondery */
export interface AddPersonRequest {
  type: "ADD_PERSON_REQUEST";
  payload: ScrapedProfileData;
}

/** Service worker → Content script: result of add person attempt */
export interface AddPersonResult {
  type: "ADD_PERSON_RESULT";
  payload:
    | {
        success: true;
        existed: boolean;
        contactId: string;
        preview?: PersonPreviewData;
      }
    | {
        success: false;
        error: string;
        requiresAuth?: boolean;
      };
}

/** Popup / Content script → Service worker: check auth state */
export interface AuthStatusRequest {
  type: "AUTH_STATUS_REQUEST";
}

/** Service worker → Popup / Content script: current auth state */
export interface AuthStatusResponse {
  type: "AUTH_STATUS_RESPONSE";
  payload: {
    isAuthenticated: boolean;
    user?: {
      id: string;
      email: string;
    };
  };
}

/** Popup → Service worker: initiate OAuth login */
export interface LoginRequest {
  type: "LOGIN_REQUEST";
}

/** Service worker → Popup: login result */
export interface LoginResult {
  type: "LOGIN_RESULT";
  payload: {
    success: boolean;
    error?: string;
  };
}

/** Popup → Service worker: log the user out */
export interface LogoutRequest {
  type: "LOGOUT_REQUEST";
}

/** Service worker → Popup: logout completed */
export interface LogoutResult {
  type: "LOGOUT_RESULT";
  payload: {
    success: boolean;
  };
}

/** Service worker → Popup: show person preview */
export interface ShowPersonPreview {
  type: "SHOW_PERSON_PREVIEW";
  payload: PersonPreviewData;
}

/** Popup → Service worker: get the currently pending preview (if any) */
export interface GetPendingPreview {
  type: "GET_PENDING_PREVIEW";
}

/** Service worker → Popup: pending preview data */
export interface PendingPreviewResult {
  type: "PENDING_PREVIEW_RESULT";
  payload: PersonPreviewData | null;
}

/** Popup → Service worker: fetch active tab social profile context */
export interface GetActiveProfileContext {
  type: "GET_ACTIVE_PROFILE_CONTEXT";
}

/** Service worker → Popup: active profile context with existence status */
export interface ActiveProfileContextResult {
  type: "ACTIVE_PROFILE_CONTEXT_RESULT";
  payload:
    | {
        supported: false;
      }
    | {
        supported: true;
        profile: ScrapedProfileData;
        existed: boolean;
        preview?: PersonPreviewData;
      };
}

// ─── Union Type ──────────────────────────────────────────────────────────────

export type ExtensionMessage =
  | AddPersonRequest
  | AddPersonResult
  | AuthStatusRequest
  | AuthStatusResponse
  | LoginRequest
  | LoginResult
  | LogoutRequest
  | LogoutResult
  | ShowPersonPreview
  | GetPendingPreview
  | PendingPreviewResult
  | GetActiveProfileContext
  | ActiveProfileContextResult;
