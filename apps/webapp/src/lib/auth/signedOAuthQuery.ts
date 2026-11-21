const _SIGNED_QUERY_ISSUED_AT_PARAM = "ba_iat";
const SIGNED_QUERY_PARAMETER_NAME_PARAM = "ba_param";

function getSignedOAuthQueryParameterNames(params: URLSearchParams): Set<string> | undefined {
  const signedParameterNames = params.getAll(SIGNED_QUERY_PARAMETER_NAME_PARAM);
  if (signedParameterNames.length === 0) {
    return undefined;
  }

  return new Set(signedParameterNames);
}

/** Mirrors `@better-auth/oauth-provider`'s signed continuation extraction for consent POSTs. */
export function buildSignedOAuthQuery(search: string): string | undefined {
  const params = new URLSearchParams(search);
  if (!params.has("sig")) {
    return undefined;
  }

  const signedParameterNames = getSignedOAuthQueryParameterNames(params);
  if (!signedParameterNames) {
    return undefined;
  }

  const signedParams = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (
      key === "sig" ||
      key === SIGNED_QUERY_PARAMETER_NAME_PARAM ||
      signedParameterNames.has(key)
    ) {
      signedParams.append(key, value);
    }
  }

  return signedParams.toString();
}
