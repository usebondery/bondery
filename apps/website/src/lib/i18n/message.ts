import { createElement, Fragment, type ReactNode } from "react";

const TOKEN = /\{(\w+)\}/g;

/** Values for `{token}` placeholders. A value may be a node, so a message can wrap a link. */
export type MessageValues = Record<string, ReactNode>;

type MessagePart = string | { token: string };

/**
 * Splits a catalog message into literal text and placeholder names, in reading order.
 * Placeholders use the same `{token}` form as the rest of `@bondery/translations`.
 */
export function splitMessage(template: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let cursor = 0;

  for (const match of template.matchAll(TOKEN)) {
    if (match.index > cursor) {
      parts.push(template.slice(cursor, match.index));
    }
    const [, token] = match;
    if (token === undefined) {
      continue;
    }
    parts.push({ token });
    cursor = match.index + match[0].length;
  }

  if (cursor < template.length) {
    parts.push(template.slice(cursor));
  }

  return parts;
}

function isNode(value: ReactNode): boolean {
  return typeof value === "object" && value !== null;
}

/**
 * Converts a placeholder value that `String()` can print without `[object Object]`.
 * Missing or non-primitive values stay `undefined` so the caller can keep `{token}` visible.
 */
function stringifyI18nPrimitive(value: unknown): string | undefined {
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return undefined;
  }
}

/** Values for a message that must come back as a plain string, such as page metadata. */
export type TextValues = Record<string, string | number>;

/**
 * Fills the placeholders of a catalog message and returns a string. A missing value leaves
 * `{token}` visible. Use `formatMessage` when a value is a node.
 */
export function formatText(template: string, values: TextValues = {}): string {
  const texts: string[] = [];
  for (const part of splitMessage(template)) {
    if (typeof part === "string") {
      texts.push(part);
      continue;
    }
    texts.push(stringifyI18nPrimitive(values[part.token]) ?? `{${part.token}}`);
  }
  return texts.join("");
}

/**
 * Fills the placeholders of a catalog message.
 *
 * A message whose values are all text returns a plain string. If a value is a node, the result is
 * a fragment, and the translator still controls where the node sits in the sentence. A missing
 * value leaves `{token}` visible, so a typo shows up in review and not as a blank gap.
 *
 * @param template Message from a `@bondery/translations` namespace.
 * @param values Replacement for each placeholder.
 */
export function formatMessage(template: string, values: MessageValues = {}): ReactNode {
  const parts = splitMessage(template);
  const hasNode = parts.some((part) => typeof part !== "string" && isNode(values[part.token]));

  if (!hasNode) {
    const texts: string[] = [];
    for (const part of parts) {
      if (typeof part === "string") {
        texts.push(part);
        continue;
      }
      texts.push(stringifyI18nPrimitive(values[part.token]) ?? `{${part.token}}`);
    }
    return texts.join("");
  }

  const seen = new Map<string, number>();
  const children: ReactNode[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      children.push(part);
      continue;
    }
    const occurrence = seen.get(part.token) ?? 0;
    seen.set(part.token, occurrence + 1);
    children.push(
      createElement(
        Fragment,
        { key: `${part.token}:${occurrence}` },
        values[part.token] ?? `{${part.token}}`,
      ),
    );
  }

  return createElement(Fragment, null, ...children);
}
