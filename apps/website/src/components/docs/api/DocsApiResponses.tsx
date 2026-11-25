"use client";

import { CodeBlock } from "@bondery/mantine-next";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { Stack, Tabs, Title } from "@mantine/core";
import { IconCode } from "@tabler/icons-react";
import {
  type ResponseExample,
  useOperation,
  useResponseExamples,
} from "fumadocs-openapi/operation";
import { formatText } from "@/lib/i18n/message";
import { DocsApiSchema } from "./DocsApiSchema";

const EXAMPLE_LABEL_RE = /^example(?<group1>\s+\S+)?$/iu;
function formatSample(sample: unknown): string {
  if (typeof sample === "string") {
    return sample;
  }

  try {
    return (JSON.stringify(sample, null, 2) as string | undefined) ?? "";
  } catch {
    return "";
  }
}

function sampleLanguage(mediaType: string | null): "json" | "plaintext" {
  return mediaType === "application/json" ? "json" : "plaintext";
}

/**
 * Label for an example. Fumadocs falls back to `Example` or `Example default`
 * when the spec has a single unnamed example, which adds no information here.
 */
function exampleLabel(example: ResponseExample): string | null {
  const { label } = example;
  if (typeof label !== "string" || label.length === 0) {
    return null;
  }
  return EXAMPLE_LABEL_RE.test(label.trim()) ? null : label.trim();
}

export function DocsApiResponses() {
  const tabs = useResponseExamples();
  const { responses } = useOperation();

  const [firstTab] = tabs;
  if (firstTab === undefined) {
    return null;
  }

  const responseByStatus = new Map(responses.map((response) => [response.status, response]));

  return (
    <Stack gap="sm">
      <Title order={3}>{docs.Api.Responses}</Title>
      <Tabs defaultValue={firstTab.code}>
        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.code} value={tab.code}>
              {tab.code}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tabs.map((tab) => {
          const schema = tab.mediaType
            ? responseByStatus.get(tab.code)?.content[tab.mediaType]?.schema
            : undefined;
          const language = sampleLanguage(tab.mediaType);

          return (
            <Tabs.Panel key={tab.code} value={tab.code}>
              <Stack gap="sm" pt="sm">
                {tab.examples?.map((example) => {
                  const label = exampleLabel(example);
                  const key = `${tab.code}:${label ?? formatSample(example.sample)}`;
                  return (
                    <Stack gap={4} key={key}>
                      {label ? <Title order={4}>{label}</Title> : null}
                      <CodeBlock
                        code={formatSample(example.sample)}
                        icon={<IconCode size={14} />}
                        label={formatText(
                          language === "json" ? docs.Api.JsonResponseLabel : docs.Api.ResponseLabel,
                          { code: tab.code },
                        )}
                        language={language}
                      />
                    </Stack>
                  );
                })}
                {schema ? <DocsApiSchema name={tab.code} schema={schema} /> : null}
              </Stack>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Stack>
  );
}
