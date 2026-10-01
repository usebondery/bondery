/**
 * First-party OAuth clients must not share a client_id: the Chrome extension
 * is a public PKCE client (`chromiumapp.org`), the webapp is a confidential
 * BFF client (`/auth/oauth-callback`). Aliasing them bakes the webapp id
 * into the store zip and production chrome.identity fails with invalid_redirect.
 */
export function assertDistinctFirstPartyOAuthClientIds(
  extensionClientId: string | undefined,
  webappClientId: string | undefined,
): void {
  const extension = extensionClientId?.trim() ?? "";
  const webapp = webappClientId?.trim() ?? "";
  if (!extension || !webapp || extension !== webapp) {
    return;
  }

  throw new Error(
    "BONDERY_PUBLIC_OAUTH_CLIENT_ID and BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID must be distinct. The Chrome extension is a public PKCE client; the webapp is a confidential BFF client.",
  );
}
