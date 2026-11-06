"use client";

import { BrandMark, CodeBlock, type CodeBlockSnippet } from "@bondery/mantine-next";
import { Code, Stack, Text, Title } from "@mantine/core";
import { useOpenAPI } from "fumadocs-openapi";
import { useOperation } from "fumadocs-openapi/operation";
import { buildSampleRequest, isMultipartSample } from "./api-sample-request";

/** One stored choice drives this block on every operation page. */
const SAMPLE_PREFERENCE_KEY = "api-sample";

const SNIPPET_LABELS = {
  curl: "cURL",
  javascript: "JavaScript",
  python: "Python",
} as const;

const SNIPPET_LANGUAGES = {
  curl: "bash",
  javascript: "javascript",
  python: "python",
} as const;

type SnippetId = keyof typeof SNIPPET_LABELS;

const SNIPPET_ORDER: readonly SnippetId[] = ["curl", "javascript", "python"];

/**
 * Copy-ready request samples above the parameter tables.
 *
 * The fumadocs generators cannot build these samples: they skip `Authorization` and
 * resolve the URL from the first server entry, which is the local development host.
 */
export function DocsApiSampleRequest() {
  const { method, parameters, path, requestBody, security } = useOperation();
  const { doc } = useOpenAPI();

  const sample = buildSampleRequest({
    method,
    parameters,
    path,
    requestBody,
    security,
    servers: doc.dereferenced.servers,
  });

  if (!sample) {
    return null;
  }

  const snippets: CodeBlockSnippet[] = SNIPPET_ORDER.map((id) => ({
    code: sample[id],
    icon: <BrandMark name={id} />,
    id,
    label: SNIPPET_LABELS[id],
    language: SNIPPET_LANGUAGES[id],
  }));

  return (
    <Stack gap="sm">
      <Title order={3}>Sample request</Title>
      <CodeBlock
        defaultSnippetId="curl"
        preferenceKey={SAMPLE_PREFERENCE_KEY}
        snippets={snippets}
      />
      {isMultipartSample(method, path) ? (
        <Text c="dimmed" size="sm">
          Send the image as a multipart/form-data field named <Code>file</Code>.
        </Text>
      ) : null}
    </Stack>
  );
}
