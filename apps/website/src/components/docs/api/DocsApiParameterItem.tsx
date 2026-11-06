"use client";

import { Box } from "@mantine/core";
import type { ReactNode } from "react";
import { DocsApiField } from "./DocsApiField";

/** Minimal JSON Schema shape used by parameters and nested properties. */
export type ParamSchema = {
  default?: unknown;
  deprecated?: boolean;
  description?: string;
  enum?: unknown[];
  format?: string;
  items?: ParamSchema;
  oneOf?: ParamSchema[];
  anyOf?: ParamSchema[];
  properties?: Record<string, ParamSchema>;
  required?: string[];
  type?: string | string[];
};

export function asParamSchema(value: unknown): ParamSchema | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as ParamSchema;
}

/** Human type label, handling unions such as `["array", "null"]`. */
export function paramTypeName(schema: ParamSchema | null): string | null {
  if (!schema) {
    return null;
  }

  const variant = schema.oneOf?.[0] ?? schema.anyOf?.[0];
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const baseType = types.find((type) => type !== "null");
  const nullable = types.includes("null");

  if (baseType === "array") {
    const itemType = paramTypeName(schema.items ?? null);
    const label = itemType ? `${itemType}[]` : "array";
    return nullable ? `${label} | null` : label;
  }

  if (types.length > 0) {
    return types.join(" | ");
  }

  if (variant) {
    return paramTypeName(variant) ?? "object";
  }

  if (schema.enum && schema.enum.length > 0) {
    return "enum";
  }

  const fallbackType = typeof schema.type === "string" ? schema.type : null;
  return schema.format ? `${fallbackType ?? "string"} (${schema.format})` : fallbackType;
}

type DocsApiParameterItemProps = {
  description?: ReactNode;
  name: string;
  required?: boolean;
  schema: ParamSchema | null;
};

/**
 * One parameter or schema property. Object properties and array items are
 * unwrapped into readable child rows behind "Show child parameters".
 */
export function DocsApiParameterItem({
  description,
  name,
  required = false,
  schema,
}: DocsApiParameterItemProps) {
  const childSchema =
    schema?.type === "array" || (Array.isArray(schema?.type) && schema.type.includes("array"))
      ? (schema.items ?? null)
      : schema;
  const children = childSchema?.properties ?? {};
  const childNames = Object.keys(children);

  return (
    <DocsApiField
      defaultValue={schema?.default}
      deprecated={schema?.deprecated === true}
      description={description}
      enumValues={schema?.enum}
      name={name}
      required={required}
      typeLabel={paramTypeName(schema)}
    >
      {childNames.length > 0
        ? childNames.map((childName) => {
            const child = children[childName] ?? {};
            return (
              <Box key={childName}>
                <DocsApiParameterItem
                  description={child.description}
                  name={childName}
                  required={childSchema?.required?.includes(childName) ?? false}
                  schema={child}
                />
              </Box>
            );
          })
        : undefined}
    </DocsApiField>
  );
}
