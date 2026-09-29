export interface McpConsentListItem {
  clientId: string;
  clientName: string;
  createdAt: string;
  id: string;
  scopes: string[];
}

export interface McpConsentsListResponse {
  consents: McpConsentListItem[];
  totalCount: number;
}
