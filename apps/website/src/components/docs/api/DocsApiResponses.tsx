"use client";

import { CodeBlock } from "@bondery/mantine-next";
import { Stack, Tabs, Title } from "@mantine/core";
import { IconCode } from "@tabler/icons-react";
import {
  type ResponseExample,
  useOperation,
  useResponseExamples,
} from "fumadocs-openapi/operation";
import { DocsApiSchema } from "./DocsApiSchema";

function formatSample(sample: unknown): string {
  if (typeof sample === "string") {
    return sample;
  }

  try {
    return JSON.stringify(sample, null, 2) ?? "";
  } catch {
    return "";
  }
}

function sampleLanguage(mediaType: string | null): string {
  return mediaType === "application/json" ? "json" : "plaintext";
}

/**
 * Label for an example. Fumadocs falls back to `Example` or `Example default`
 * when the spec has a single unnamed example, which adds no information here.
 */
function exampleLabel(example: ResponseExample): string | null {
  const label = example.label;
  if (typeof label !== "string" || label.length === 0) {
    return null;
  }
  return /^example(\s+\S+)?$/i.test(label.trim()) ? null : label.trim();
}

export function DocsApiResponses() {
  const tabs = useResponseExamples();
  const { responses } = useOperation();

  if (tabs.length === 0) {
    return null;
  }

  const responseByStatus = new Map(responses.map((response) => [response.status, response]));

  return (
    <Stack gap="sm">
      <Title order={3}>Responses</Title>
      <Tabs defaultValue={tabs[0].code}>
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
                        label={`${tab.code} ${language === "json" ? "JSON" : "response"}`}
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
