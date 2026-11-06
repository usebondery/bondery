"use client";

import { Badge } from "@mantine/core";

const METHOD_COLOR = {
  delete: "red",
  get: "green",
  patch: "yellow",
  post: "blue",
  put: "orange",
} as const;

type HttpMethodName = keyof typeof METHOD_COLOR;

function isHttpMethodName(method: string): method is HttpMethodName {
  return Object.hasOwn(METHOD_COLOR, method);
}

type DocsApiMethodBadgeProps = {
  method: string;
  size?: "xs" | "sm";
};

export function DocsApiMethodBadge({ method, size }: DocsApiMethodBadgeProps) {
  const normalized = method.toLowerCase();
  const color = isHttpMethodName(normalized) ? METHOD_COLOR[normalized] : "gray";

  return (
    <Badge
      color={color}
      ff="monospace"
      radius="sm"
      size={size}
      style={{ flexShrink: 0 }}
      variant="light"
    >
      {method.toUpperCase()}
    </Badge>
  );
}
