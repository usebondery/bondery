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
  title?: string;
  companyName: string;
  /** LinkedIn company handle or numeric ID */
  companyLinkedinId?: string;
  companyLogoUrl?: string;
  startDate?: string;
  endDate?: string;
  employmentType?: string;
  location?: string;
  description?: string;
}

/** A single scraped education entry */
export interface EducationEntry {
  schoolName: string;
  /** LinkedIn school handle or numeric ID */
  schoolLinkedinId?: string;
  schoolLogoUrl?: string;
  degree?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

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
  location?: string;
  notes?: string;
  /** Work history to persist when creating a new contact */
  workHistory?: ScrapedWorkEntry[];
  /** Education history to persist when creating a new contact */
  educationHistory?: EducationEntry[];
  /** LinkedIn bio / about section text */
  linkedinBio?: string;
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

/** Content script → Service worker: upsert scraped LinkedIn work history for a known contact */
export interface UpsertLinkedInDataRequest {
  type: "UPSERT_LINKEDIN_DATA";
  payload: {
    contactId: string;
    workHistory: ScrapedWorkEntry[];
  };
}

/** Service worker → Content script: result of upsert */
export interface UpsertLinkedInDataResult {
  type: "UPSERT_LINKEDIN_DATA_RESULT";
  payload: { success: boolean; error?: string };
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

// ─── Enrich from LinkedIn ────────────────────────────────────────────────────

/** Webapp → Extension (via webapp.content bridge): enrich an existing contact from LinkedIn */
export interface EnrichPersonRequest {
  type: "ENRICH_PERSON_REQUEST";
  payload: {
    contactId: string;
    linkedinHandle: string;
    /** Unique request ID for correlating the response */
    requestId: string;
  };
}

/** LinkedIn content script → Service worker: ask for pending enrich context */
export interface GetEnrichContext {
  type: "GET_ENRICH_CONTEXT";
}

/** Service worker → LinkedIn content script: context for auto-enrich (sent when tab asks) */
export interface EnrichContextResult {
  type: "ENRICH_CONTEXT_RESULT";
  payload: {
    contactId: string;
    linkedinHandle: string;
    requestId: string;
  } | null;
}

/** LinkedIn content script → Service worker: scraped data for enrich */
export interface SubmitEnrichData {
  type: "SUBMIT_ENRICH_DATA";
  payload: {
    requestId: string;
    contactId: string;
    profile: ScrapedProfileData;
  };
}

/** Service worker → webapp.content bridge: ack that enrich request was received */
export interface EnrichPersonAck {
  type: "ENRICH_PERSON_ACK";
  payload: { requestId: string };
}

/** LinkedIn content script → Service worker: report an enrich error (profile mismatch, scrape failure, etc.) */
export interface EnrichError {
  type: "ENRICH_ERROR";
  payload: {
    requestId: string;
    error: string;
  };
}

/** Extension → Webapp (via webapp.content bridge): enrich result */
export interface EnrichPersonResult {
  type: "ENRICH_PERSON_RESULT";
  payload: {
    requestId: string;
  } & ({ success: true; contactId: string } | { success: false; error: string });
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
  | UpsertLinkedInDataRequest
  | UpsertLinkedInDataResult
  | GetActiveProfileContext
  | ActiveProfileContextResult
  | EnrichPersonRequest
  | EnrichPersonAck
  | EnrichError
  | GetEnrichContext
  | EnrichContextResult
  | SubmitEnrichData
  | EnrichPersonResult;
