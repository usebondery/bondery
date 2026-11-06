"use client";

import { Stack, Text } from "@mantine/core";
import {
  OperationProvider,
  type PageOperationProps,
  useOperation,
} from "fumadocs-openapi/operation";
import { DocsApiAuthNotice } from "./DocsApiAuthNotice";
import { DocsApiOperationHeader } from "./DocsApiOperationHeader";
import { DocsApiParameters } from "./DocsApiParameters";
import { DocsApiRequestBody } from "./DocsApiRequestBody";
import { DocsApiResponses } from "./DocsApiResponses";
import { DocsApiSampleRequest } from "./DocsApiSampleRequest";

function DocsApiOperationBody({
  showDescription = true,
  showTitle = false,
}: {
  showDescription?: boolean;
  showTitle?: boolean;
}) {
  const { description } = useOperation();

  return (
    <Stack gap="lg">
      <DocsApiOperationHeader showTitle={showTitle} />
      {showDescription !== false && description ? <Text>{description}</Text> : null}
      <DocsApiAuthNotice />
      <DocsApiSampleRequest />
      <DocsApiParameters />
      <DocsApiRequestBody />
      <DocsApiResponses />
    </Stack>
  );
}

export function DocsApiOperation({
  method,
  operation,
  path,
  pathItem,
  showDescription,
  showTitle,
  type,
}: PageOperationProps) {
  return (
    <OperationProvider
      method={method}
      operation={operation}
      path={path}
      pathItem={pathItem}
      type={type}
    >
      <DocsApiOperationBody showDescription={showDescription} showTitle={showTitle} />
    </OperationProvider>
  );
}
