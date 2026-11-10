"use client";

import type { JsonSchema } from "@fumadocs/json-schema";
import {
  generateSchemaUI,
  type SchemaData,
  type SchemaDataObjectProperty,
  type SchemaUIGeneratedData,
} from "@fumadocs/json-schema/react";
import { Box, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsApiField } from "./DocsApiField";

type DocsApiSchemaProps = {
  name: string;
  schema: unknown;
};

function toJsonSchema(schema: unknown): JsonSchema | null {
  if (typeof schema === "boolean") {
    return schema;
  }

  if (typeof schema === "object" && schema !== null && !Array.isArray(schema)) {
    // Callers pass OpenAPI schema objects. generateSchemaUI requires JsonSchema.
    return schema as JsonSchema;
  }

  return null;
}

type SchemaFieldProps = {
  data: SchemaData;
  generated: SchemaUIGeneratedData;
  id: string;
  name: string;
  required?: boolean;
  trail: readonly string[];
};

/** Object properties of a response field, unwrapping arrays and unions. */
function objectProperties(
  data: SchemaData,
  generated: SchemaUIGeneratedData,
): SchemaDataObjectProperty[] | null {
  if (data.type === "object") {
    return data.props;
  }

  if (data.type === "array") {
    const item = generated.refs[data.item.$type];
    return item?.type === "object" ? item.props : null;
  }

  if (data.type === "or" || data.type === "and") {
    for (const entry of data.items) {
      const ref = generated.refs[entry.$type];
      if (ref?.type === "object") {
        return ref.props;
      }
    }
    return null;
  }

  return null;
}

/** Response field in the same row format as request parameters. */
function SchemaField({ data, generated, id, name, required, trail }: SchemaFieldProps) {
  const nextTrail = [...trail, id];
  const seen = trail.includes(id);
  const props = seen ? null : objectProperties(data, generated);

  const children =
    props && props.length > 0
      ? props.map((property) => (
          <SchemaRef
            generated={generated}
            id={property.$type}
            key={`${property.name}:${property.$type}`}
            name={property.name}
            required={property.required}
            trail={nextTrail}
          />
        ))
      : undefined;

  return (
    <DocsApiField
      deprecated={data.deprecated === true}
      description={data.description}
      name={name}
      required={required}
      typeLabel={data.typeName}
    >
      {children}
    </DocsApiField>
  );
}

function SchemaRef({
  generated,
  id,
  name,
  required,
  trail,
}: {
  generated: SchemaUIGeneratedData;
  id: string;
  name: string;
  required?: boolean;
  trail: readonly string[];
}) {
  const data: SchemaData | undefined = generated.refs[id];

  if (!data) {
    return null;
  }

  return (
    <SchemaField
      data={data}
      generated={generated}
      id={id}
      name={name}
      required={required}
      trail={trail}
    />
  );
}

/** Response schema as a list of fields, matching the parameter list. */
export function DocsApiSchema({ name, schema }: DocsApiSchemaProps) {
  const root = toJsonSchema(schema);
  const generated = useMemo(() => {
    if (root === null) {
      return null;
    }

    return generateSchemaUI({
      // Show read-only and write-only fields. The defaults hide both.
      readOnly: true,
      renderCodeblock: ({ code, lang }) => <DocsCodeBlock code={code} language={lang} />,
      renderMarkdown: (markdown) => <Text component="span">{markdown}</Text>,
      root,
      translations: {},
      writeOnly: true,
    });
  }, [root]);

  if (!generated) {
    return null;
  }

  const rootData: SchemaData | undefined = generated.refs[generated.$root];
  const props = rootData ? objectProperties(rootData, generated) : null;

  // The root itself is the response body. Render its fields directly instead of
  // wrapping them in a redundant row named after the status code.
  if (props && props.length > 0) {
    return (
      <Box>
        <Stack gap="md">
          {props.map((property) => (
            <SchemaRef
              generated={generated}
              id={property.$type}
              key={`${property.name}:${property.$type}`}
              name={property.name}
              required={property.required}
              trail={[generated.$root]}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <SchemaRef generated={generated} id={generated.$root} name={name} trail={[]} />
    </Box>
  );
}
