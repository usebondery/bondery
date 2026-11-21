import { AnchorLink, hrefAssert } from "@bondery/mantine-next";
import { API_ERROR_CODE_ENTRIES, API_ERROR_CODES, API_ERROR_TYPES } from "@bondery/schemas/errors";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { Code, Stack, Text, Title } from "@mantine/core";
import { WEBSITE_URL } from "@/lib/config";
import { formatMessage } from "@/lib/i18n/message";

/** Field name in the error body. It is not translated, because clients match it. */
const DOC_URL_FIELD = "doc_url";

export function ApiErrorsIndex() {
  const grouped = API_ERROR_TYPES.map((type) => ({
    codes: API_ERROR_CODES.filter((code) => API_ERROR_CODE_ENTRIES[code].type === type),
    type,
  }));

  return (
    <Stack gap="xl">
      {grouped.map(({ type, codes }) => (
        <Stack component="section" gap="xs" key={type}>
          <Title order={2}>{type}</Title>
          <Stack component="ul" gap={4} style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {codes.map((code) => (
              <li key={code}>
                {/* `AnchorLink` keeps the link client-side. A server component
                    cannot hand the `component` prop a function. */}
                <AnchorLink href={hrefAssert(`/docs/api/errors/${code}`)}>
                  <Code>{code}</Code>
                </AnchorLink>
              </li>
            ))}
          </Stack>
        </Stack>
      ))}
      <Text c="dimmed" size="sm">
        {formatMessage(docs.ApiErrors.BaseUrl, {
          field: <Code>{DOC_URL_FIELD}</Code>,
          url: WEBSITE_URL,
        })}
      </Text>
    </Stack>
  );
}
