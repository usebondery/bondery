"use client";

import { AnchorLink, hrefAssert } from "@bondery/mantine-next";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { Alert, Code, Text } from "@mantine/core";
import { useOperation } from "fumadocs-openapi/operation";
import { formatMessage } from "@/lib/i18n/message";

const API_KEY_SCHEME = "apiKeyAuth";
const SESSION_SCHEME = "bearerAuth";

/** The header as a client writes it. It is a code sample, so it is not translated. */
const AUTH_HEADER_EXAMPLE = "Authorization: Bearer <token>";

/** Title names the credential in plain language. Raw scheme ids never reach the page. */
function noticeTitle(keys: ReadonlySet<string>): string {
  const hasApiKey = keys.has(API_KEY_SCHEME);
  const hasSession = keys.has(SESSION_SCHEME);

  if (hasApiKey && hasSession) {
    return docs.Api.AuthTitle.ApiKeyOrSession;
  }

  if (hasApiKey) {
    return docs.Api.AuthTitle.ApiKey;
  }

  if (hasSession) {
    return docs.Api.AuthTitle.Session;
  }

  return docs.Api.AuthTitle.Generic;
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
        {formatMessage(docs.Api.SendHeader, { header: <Code>{AUTH_HEADER_EXAMPLE}</Code> })}
      </Text>
      <AnchorLink href={hrefAssert("/docs/api/authentication")}>{docs.Api.AuthGuide}</AnchorLink>
    </Alert>
  );
}
