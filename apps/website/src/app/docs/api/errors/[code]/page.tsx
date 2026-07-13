import {
  API_ERROR_CODE_ENTRIES,
  API_ERROR_CODES,
  getErrorDefinition,
  isApiErrorCode,
} from "@bondery/schemas/errors";
import { Code, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WEBSITE_URL } from "@/lib/config";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  return API_ERROR_CODES.map((code) => ({ code }));
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  if (!isApiErrorCode(code)) {
    return { title: "API error" };
  }
  return {
    description: getErrorDefinition(code).messageTemplate,
    title: `${code} — API error`,
  };
}

export default async function ApiErrorCodePage({ params }: PageProps) {
  const { code } = await params;
  if (!isApiErrorCode(code)) {
    notFound();
  }

  const definition = API_ERROR_CODE_ENTRIES[code];
  const docUrl = `${WEBSITE_URL.replace(/\/$/, "")}/docs/api/errors/${code}`;

  return (
    <Stack gap="md" maw={800} mx="auto" px="md" py="xl">
      <Text c="dimmed" component={Link} href="/docs/api/errors" size="sm">
        ← All API error codes
      </Text>
      <Title order={1}>
        <Code>{code}</Code>
      </Title>
      <Stack gap="xs">
        <Text>
          <Text fw={600} span>
            Type:
          </Text>{" "}
          <Code>{definition.type}</Code>
        </Text>
        <Text>
          <Text fw={600} span>
            HTTP status:
          </Text>{" "}
          {definition.httpStatus}
        </Text>
        <Text>
          <Text fw={600} span>
            Developer message:
          </Text>{" "}
          {definition.messageTemplate}
        </Text>
        <Text>
          <Text fw={600} span>
            doc_url:
          </Text>{" "}
          <Code>{docUrl}</Code>
        </Text>
      </Stack>
    </Stack>
  );
}
