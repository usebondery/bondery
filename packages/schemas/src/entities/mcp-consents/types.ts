export interface McpConsentListItem {
  clientId: string;
  clientName: string;
  createdAt: string;
  id: string;
  /** HTTPS `logo_uri` from OAuth client metadata when present. */
  logoUri: string | null;
  scopes: string[];
}

export interface McpConsentsListResponse {
  consents: McpConsentListItem[];
  totalCount: number;
}
