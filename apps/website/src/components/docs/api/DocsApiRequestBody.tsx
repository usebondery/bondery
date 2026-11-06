"use client";

import { Badge, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { useOperation } from "fumadocs-openapi/operation";
import { asParamSchema, DocsApiParameterItem } from "./DocsApiParameterItem";
import { DocsApiSchema } from "./DocsApiSchema";

/**
 * Request body. The body schema is also a list of parameters, so the top-level
 * properties use the same row style as query and path parameters.
 */
export function DocsApiRequestBody() {
  const { requestBody } = useOperation();

  if (!requestBody) {
    return null;
  }

  const entries = Object.entries(requestBody.content);

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Title order={3}>Request body</Title>
        {requestBody.required ? (
          <Badge color="red" size="sm" variant="light">
            Required
          </Badge>
        ) : null}
      </Group>
      {requestBody.description ? <Text>{requestBody.description}</Text> : null}
      {entries.map(([mediaType, media], index) => {
        const schema = asParamSchema(media.schema);
        const properties = schema?.properties ?? {};
        const propertyNames = Object.keys(properties);

        return (
          <Stack gap="sm" key={mediaType}>
            {index > 0 ? <Divider /> : null}
            {entries.length > 1 ? (
              <Text c="dimmed" ff="monospace" size="sm">
                {mediaType}
              </Text>
            ) : null}
            {propertyNames.length > 0 ? (
              <Stack gap="md">
                {propertyNames.map((name) => {
                  const property = properties[name] ?? {};
                  return (
                    <DocsApiParameterItem
                      description={
                        typeof property.description === "string" ? property.description : undefined
                      }
                      key={name}
                      name={name}
                      required={schema?.required?.includes(name) ?? false}
                      schema={property}
                    />
                  );
                })}
              </Stack>
            ) : media.schema ? (
              <DocsApiSchema name={mediaType} schema={media.schema} />
            ) : null}
          </Stack>
        );
      })}
    </Stack>
  );
}
