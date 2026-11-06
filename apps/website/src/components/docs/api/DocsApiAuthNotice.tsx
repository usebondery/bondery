"use client";

import { AnchorLink, hrefAssert } from "@bondery/mantine-next";
import { Alert, Code, Text } from "@mantine/core";
import { useOperation } from "fumadocs-openapi/operation";

const API_KEY_SCHEME = "apiKeyAuth";
const SESSION_SCHEME = "bearerAuth";

/** Title names the credential in plain language. Raw scheme ids never reach the page. */
function noticeTitle(keys: ReadonlySet<string>): string {
  const hasApiKey = keys.has(API_KEY_SCHEME);
  const hasSession = keys.has(SESSION_SCHEME);

  if (hasApiKey && hasSession) {
    return "Requires an API key or a session token.";
  }

  if (hasApiKey) {
    return "Requires an API key.";
  }

  if (hasSession) {
    return "Requires a session token.";
  }

  return "Requires authentication.";
}

export function DocsApiAuthNotice() {
  const { security } = useOperation();
  const keys = new Set<string>();

  for (const group of security) {
    for (const scheme of group) {
      keys.add(scheme.key);
    }
  }

  if (keys.size === 0) {
    return null;
  }

  return (
    <Alert title={noticeTitle(keys)}>
      <Text size="sm">
        Send <Code>Authorization: Bearer &lt;token&gt;</Code>.
      </Text>
      <AnchorLink href={hrefAssert("/docs/api/authentication")}>
        Read the authentication guide
      </AnchorLink>
    </Alert>
  );
}
