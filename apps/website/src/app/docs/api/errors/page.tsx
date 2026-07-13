import { API_ERROR_CODE_ENTRIES, API_ERROR_CODES, API_ERROR_TYPES } from "@bondery/schemas/errors";
import { Anchor, Code, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { WEBSITE_URL } from "@/lib/config";

export const metadata = {
  description: "Machine-readable error codes returned by the Bondery API.",
  title: "API error codes",
};

export default function ApiErrorsIndexPage() {
  const grouped = API_ERROR_TYPES.map((type) => ({
    codes: API_ERROR_CODES.filter((code) => API_ERROR_CODE_ENTRIES[code].type === type),
    type,
  }));

  return (
    <Stack gap="lg" maw={800} mx="auto" px="md" py="xl">
      <Title order={1}>API error codes</Title>
      <Text c="dimmed">
        Every failed API response uses a nested{" "}
        <Code>{`{ error: { type, code, message, ... } }`}</Code> envelope. Use <Code>code</Code> for
        client-side translation — never show <Code>message</Code> in product UI.
      </Text>

      {grouped.map(({ type, codes }) => (
        <Stack gap="xs" key={type}>
          <Title order={2} size="h3">
            {type}
          </Title>
          <Stack gap={4}>
            {codes.map((code) => (
              <Anchor component={Link} href={`/docs/api/errors/${code}`} key={code}>
                <Code>{code}</Code>
              </Anchor>
            ))}
          </Stack>
        </Stack>
      ))}

      <Text c="dimmed" size="sm">
        Base URL for <Code>doc_url</Code> fields: {WEBSITE_URL}
      </Text>
    </Stack>
  );
}
