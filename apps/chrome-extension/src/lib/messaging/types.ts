import type { UserSettingsProfile } from "../api/domains/me";

/**
 * Extension Message Protocol
 *
 * Typed message definitions for communication between:
 * - Content scripts ↔ Service Worker
 * - Popup ↔ Service Worker
 */

// ─── Payloads ────────────────────────────────────────────────────────────────

/** A single scraped work history entry */
export interface ScrapedWorkEntry {
  /** LinkedIn company handle or numeric ID */
  companyLinkedinId?: string;
  companyLogoUrl?: string;
  companyName: string;
  description?: string;
  employmentType?: string;
  endDate?: string;
  location?: string;
  startDate?: string;
  title?: string;
}

/** A single scraped education entry */
export interface EducationEntry {
  degree?: string;
  description?: string;
  endDate?: string;
  /** LinkedIn school handle or numeric ID */
  schoolLinkedinId?: string;
  schoolLogoUrl?: string;
  schoolName: string;
  startDate?: string;
}

/** Profile data scraped from social media by content scripts */
export interface ScrapedProfileData {
  displayName?: string;
  /** Education history to persist when creating a new contact */
  educationHistory?: EducationEntry[];
  firstName?: string;
  handle: string;
  headline?: string;
  lastName?: string;
  /** LinkedIn bio / about section text */
  linkedinBio?: string;
  location?: string;
  middleName?: string;
  notes?: string;
  platform: "instagram" | "linkedin" | "facebook";
  profileImageUrl?: string;
  /** Work history to persist when creating a new contact */
  workHistory?: ScrapedWorkEntry[];
}

/** Person preview for the "already exists" popup */
export interface PersonPreviewData {
  avatar: string | null;
  contactId: string;
  firstName: string;
  handle: string;
  lastName: string | null;
  platform: string;
}

// ─── Message Types ───────────────────────────────────────────────────────────

/** Content script → Service worker: add this person to Bondery */
export interface AddPersonRequest {
  payload: ScrapedProfileData;
  type: "ADD_PERSON_REQUEST";
}

/** Service worker → Content script: result of add person attempt */
export interface AddPersonResult {
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
  type: "ADD_PERSON_RESULT";
}

/** Popup / Content script → Service worker: check auth state */
export interface AuthStatusRequest {
  type: "AUTH_STATUS_REQUEST";
}

/** Service worker → Popup / Content script: current auth state */
export interface AuthStatusResponse {
  payload: {
    isAuthenticated: boolean;
    user?: {
      id: string;
      email: string;
    };
  };
  type: "AUTH_STATUS_RESPONSE";
}

/** Popup → Service worker: initiate OAuth login */
export interface LoginRequest {
  type: "LOGIN_REQUEST";
}

/** Service worker → Popup: login result */
export interface LoginResult {
  payload: {
    success: boolean;
    error?: string;
  };
  type: "LOGIN_RESULT";
}

/** Popup → Service worker: log the user out */
export interface LogoutRequest {
  type: "LOGOUT_REQUEST";
}

/** Service worker → Popup: logout completed */
export interface LogoutResult {
  payload: {
    success: boolean;
  };
  type: "LOGOUT_RESULT";
}

/** Service worker → Popup: show person preview */
export interface ShowPersonPreview {
  payload: PersonPreviewData;
  type: "SHOW_PERSON_PREVIEW";
}

/** Popup → Service worker: get the currently pending preview (if any) */
export interface GetPendingPreview {
  type: "GET_PENDING_PREVIEW";
}

/** Service worker → Popup: pending preview data */
export interface PendingPreviewResult {
  payload: PersonPreviewData | null;
  type: "PENDING_PREVIEW_RESULT";
}

/** Content script → Service worker: upsert scraped LinkedIn work history for a known contact */
export interface UpsertLinkedInDataRequest {
  payload: {
    contactId: string;
    workHistory: ScrapedWorkEntry[];
  };
  type: "UPSERT_LINKEDIN_DATA";
}

/** Service worker → Content script: result of upsert */
export interface UpsertLinkedInDataResult {
  payload: { success: boolean; error?: string };
  type: "UPSERT_LINKEDIN_DATA_RESULT";
}

/** Popup → Service worker: fetch active tab social profile context */
export interface GetActiveProfileContext {
  type: "GET_ACTIVE_PROFILE_CONTEXT";
}

/** Service worker → Popup: active profile context with existence status */
export interface ActiveProfileContextResult {
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
  type: "ACTIVE_PROFILE_CONTEXT_RESULT";
}

// ─── Enrich from LinkedIn ────────────────────────────────────────────────────

/** Webapp → Extension (via webapp.content bridge): enrich an existing contact from LinkedIn */
export interface EnrichPersonRequest {
  payload: {
    contactId: string;
    linkedinHandle: string;
    /** Unique request ID for correlating the response */
    requestId: string;
  };
  type: "ENRICH_PERSON_REQUEST";
}

/** LinkedIn content script → Service worker: ask for pending enrich context */
export interface GetEnrichContext {
  type: "GET_ENRICH_CONTEXT";
}

/** Service worker → LinkedIn content script: context for auto-enrich (sent when tab asks) */
export interface EnrichContextResult {
  payload: {
    contactId: string;
    linkedinHandle: string;
    requestId: string;
  } | null;
  type: "ENRICH_CONTEXT_RESULT";
}

/** Service worker → LinkedIn content script: run pending enrich scrape */
export interface RunPendingEnrich {
  payload: { requestId: string };
  type: "RUN_PENDING_ENRICH";
}

/** LinkedIn content script → Service worker: scraped data for enrich */
export interface SubmitEnrichData {
  payload: {
    requestId: string;
    contactId: string;
    profile: ScrapedProfileData;
  };
  type: "SUBMIT_ENRICH_DATA";
}

/** Service worker → webapp.content bridge: ack that enrich request was received */
export interface EnrichPersonAck {
  payload: { requestId: string };
  type: "ENRICH_PERSON_ACK";
}

/** LinkedIn content script → Service worker: report an enrich error (profile mismatch, scrape failure, etc.) */
export interface EnrichError {
  payload: {
    requestId: string;
    error: string;
  };
  type: "ENRICH_ERROR";
}

/** Extension → Webapp (via webapp.content bridge): enrich result */
export interface EnrichPersonResult {
  payload: {
    requestId: string;
  } & ({ success: true; contactId: string } | { success: false; error: string });
  type: "ENRICH_PERSON_RESULT";
}

/** Popup → Background: ask if an extension update is required */
export interface VersionCheckRequest {
  type: "VERSION_CHECK_REQUEST";
}

/** Background → Popup: whether extension update is required */
export interface VersionCheckResponse {
  payload: { updateRequired: boolean };
  type: "VERSION_CHECK_RESPONSE";
}

// ─── Union Type ──────────────────────────────────────────────────────────────

/** Popup -> Service worker: fetch authenticated user settings */
export interface UserSettingsRequest {
  type: "USER_SETTINGS_REQUEST";
}

/** Service worker -> Popup: user settings profile */
export interface UserSettingsResponse {
  payload: UserSettingsProfile | { error: string; requiresAuth?: boolean };
  type: "USER_SETTINGS_RESPONSE";
}

/** Webapp bridge → Background: open the extensions management page */
export interface OpenExtensionsPageRequest {
  type: "OPEN_EXTENSIONS_PAGE";
}

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
  | UpsertLinkedInDataRequest
  | UpsertLinkedInDataResult
  | GetActiveProfileContext
  | ActiveProfileContextResult
  | EnrichPersonRequest
  | EnrichPersonAck
  | EnrichError
  | GetEnrichContext
  | EnrichContextResult
  | RunPendingEnrich
  | SubmitEnrichData
  | EnrichPersonResult
  | VersionCheckRequest
  | VersionCheckResponse
  | UserSettingsRequest
  | UserSettingsResponse
  | OpenExtensionsPageRequest;
