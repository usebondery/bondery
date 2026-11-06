"use client";

import { Box, Divider, Stack, Text, Title } from "@mantine/core";
import { type OperationParameters, useOperation } from "fumadocs-openapi/operation";
import type { ReactNode } from "react";
import { asParamSchema, DocsApiParameterItem } from "./DocsApiParameterItem";

const PARAMETER_GROUP_TITLE: Record<OperationParameters["in"], string> = {
  cookie: "Cookie parameters",
  header: "Header parameters",
  path: "Path parameters",
  query: "Query parameters",
};

type ParameterLike = {
  deprecated?: boolean;
  description?: unknown;
  name: string;
  required?: boolean;
  schema?: unknown;
};

function descriptionOf(value: unknown): ReactNode {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Parameters as a Stripe-style list. Each item shows the name, type, default,
 * allowed values, and description. Object parameters reveal their children.
 */
export function DocsApiParameters() {
  const { parameters } = useOperation();
  const groups = parameters.filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <Stack gap="md">
      <Title order={3}>Parameters</Title>
      {groups.map((group, groupIndex) => (
        <Stack gap="sm" key={group.in}>
          {groupIndex > 0 ? <Divider /> : null}
          <Text fw={600} size="sm">
            {PARAMETER_GROUP_TITLE[group.in]}
          </Text>
          <Stack gap="md">
            {(group.items as unknown as ParameterLike[]).map((parameter, index) => (
              <Box key={parameter.name}>
                {index > 0 ? <Divider mb="md" /> : null}
                <DocsApiParameterItem
                  description={descriptionOf(parameter.description)}
                  name={parameter.name}
                  required={parameter.required === true}
                  schema={asParamSchema(parameter.schema)}
                />
              </Box>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
