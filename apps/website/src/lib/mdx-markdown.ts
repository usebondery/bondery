import type { LLMsOptions } from "fumadocs-core/mdx-plugins/remark-llms";

/**
 * Compile-time Markdown forms for docs MDX components, used by the
 * `includeProcessedMarkdown` option in `src/lib/collections.ts`.
 *
 * These components are client modules, so `renderToMarkdown` cannot run them on
 * the server. Their props are static in MDX, so stringify them here instead of
 * leaking JSX into the agent-facing Markdown.
 */

type FilterElement = NonNullable<LLMsOptions["filterElement"]>;
type Stringify = NonNullable<LLMsOptions["stringify"]>;

type Node = Parameters<Stringify>[0];
type State = Parameters<Stringify>[2];
type Info = Parameters<Stringify>[3];

type JsxNode = {
  attributes?: { name?: string | null; type: string; value?: unknown }[];
  children?: unknown[];
  name?: string | null;
  type: string;
};

function asJsx(node: Node): JsxNode | undefined {
  if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") {
    return undefined;
  }
  return node as unknown as JsxNode;
}

function stringAttribute(node: JsxNode, name: string): string | undefined {
  const found = node.attributes?.find(
    (attr) => attr.name === name && attr.type === "mdxJsxAttribute",
  );
  return typeof found?.value === "string" ? found.value : undefined;
}

type EstreeNode = {
  expressions?: unknown[];
  quasis?: { value?: { cooked?: unknown } }[];
  type?: string;
  value?: unknown;
};

type ExpressionAttributeValue = {
  data?: { estree?: { body?: { expression?: EstreeNode; type?: string }[] } };
};

/**
 * Pulls a static string out of an MDX expression attribute, e.g. ``posix={`a b`}``.
 * Only an empty-substitution template literal or a string literal qualifies.
 */
function expressionAttribute(node: JsxNode, name: string): string | undefined {
  const found = node.attributes?.find(
    (attr) => attr.name === name && attr.type === "mdxJsxAttribute",
  );
  if (!found) {
    return undefined;
  }

  const statement = (found.value as ExpressionAttributeValue | undefined)?.data?.estree?.body?.[0];
  const expression = statement?.type === "ExpressionStatement" ? statement.expression : undefined;

  if (expression?.type === "Literal" && typeof expression.value === "string") {
    return expression.value;
  }

  if (expression?.type === "TemplateLiteral" && (expression.expressions?.length ?? 0) === 0) {
    const cooked = expression.quasis?.[0]?.value?.cooked;
    return typeof cooked === "string" ? cooked : undefined;
  }

  return undefined;
}

/** Attribute text for either a quoted literal or a static expression. */
function attributeText(node: JsxNode, name: string): string | undefined {
  return stringAttribute(node, name) ?? expressionAttribute(node, name);
}

function flow(state: State, info: Info, children: unknown[]): string {
  return state
    .containerFlow({ children, type: "root" } as Parameters<State["containerFlow"]>[0], info)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function indent(text: string, size: number): string {
  const pad = " ".repeat(size);
  return text
    .split("\n")
    .map((line) => (line.length === 0 ? line : pad + line))
    .join("\n");
}

/**
 * A numbered list item cannot hold a Markdown heading, so a leading heading in a
 * step becomes a bold line. Without this, `## Title` breaks the list.
 */
function stepBody(state: State, info: Info, children: unknown[]): string {
  const body = flow(state, info, children);
  const heading = /^#{1,6}\s+(.+?)(?:\s+\[#[^\]]*\])?\s*$/m.exec(body);

  if (!heading || heading.index !== 0) {
    return body;
  }

  return `**${heading[1] ?? ""}**${body.slice(heading[0].length)}`;
}

function bullet(title: string, href: string, description?: string): string {
  const label = `[${title}](${href})`;
  return description ? `- ${label}: ${description}` : `- ${label}`;
}

/** `<Card>` becomes a list item, so every card stays reachable as a link. */
function cardMarkdown(node: JsxNode, state: State, info: Info): string | undefined {
  const title = stringAttribute(node, "title");
  const href = stringAttribute(node, "href");
  if (!title || !href) {
    return undefined;
  }

  const body = flow(state, info, node.children ?? []) || stringAttribute(node, "description");
  return `${bullet(title, href, body)}\n`;
}

/** `<Step>` without a `<Steps>` parent still reads as one numbered item. */
function stepMarkdown(node: JsxNode, state: State, info: Info): string {
  const body = stepBody(state, info, node.children ?? []).replace(/\n(?!\n)/g, "\n   ");
  return `\n1. ${body}\n`;
}

/** `<Steps>` re-numbers its `<Step>` children. */
function stepsMarkdown(node: JsxNode, state: State, info: Info): string {
  const items: string[] = [];

  for (const [index, child] of (node.children ?? []).entries()) {
    const step = asJsx(child as Node);
    if (!step || step.name !== "Step") {
      continue;
    }
    const body = stepBody(state, info, step.children ?? []).replace(/\n(?!\n)/g, "\n   ");
    items.push(`${index + 1}. ${body}`);
  }

  if (items.length === 0) {
    return `\n${flow(state, info, node.children ?? [])}\n\n`;
  }

  return `\n${items.join("\n")}\n\n`;
}

/** `<Callout>` becomes a blockquote led by its title or severity. */
function calloutMarkdown(node: JsxNode, state: State, info: Info): string {
  const title = stringAttribute(node, "title");
  const warn = stringAttribute(node, "type") === "warn";
  const body = flow(state, info, node.children ?? []);
  const inner = body.length > 0 ? body.split("\n") : [];

  if (inner.length > 0) {
    inner.unshift("");
  }

  const quoted = [`> **${title ?? (warn ? "Warning" : "Note")}**`];
  for (const line of inner) {
    quoted.push(line.length === 0 ? ">" : `> ${line}`);
  }

  return `\n${quoted.join("\n")}\n\n`;
}

/** `<Accordion>` keeps its title as a heading, so collapsed text stays searchable. */
function accordionMarkdown(node: JsxNode, state: State, info: Info): string {
  const title = stringAttribute(node, "title");
  const body = flow(state, info, node.children ?? []);

  if (!title) {
    return `\n${body}\n\n`;
  }

  return `\n### ${title}\n\n${body}\n\n`;
}

/** `<File>` and `<Folder>` become a nested list of paths. */
function fileMarkdown(node: JsxNode): string | undefined {
  const name = stringAttribute(node, "name");
  return name ? `\n- \`${name}\`` : undefined;
}

function folderMarkdown(node: JsxNode, state: State, info: Info): string | undefined {
  const name = stringAttribute(node, "name");
  const body = flow(state, info, node.children ?? []);

  if (!name) {
    return `\n${body}`;
  }

  return body.length > 0 ? `\n- \`${name}\`\n${indent(body, 2)}` : `\n- \`${name}\``;
}

/** Static container: render children only. */
function containerMarkdown(node: JsxNode, state: State, info: Info): string {
  return `\n${flow(state, info, node.children ?? [])}\n\n`;
}

/** Fences code for Markdown, widening the fence past any backtick run inside it. */
function fencedBlock(code: string, language: string): string {
  const runs = [...code.matchAll(/`+/g)].map((match) => match[0].length);
  const marker = "`".repeat(Math.max(3, ...runs.map((length) => length + 1)));
  return `${marker}${language}\n${code}\n${marker}`;
}

function trimmedAttribute(node: JsxNode, name: string): string | undefined {
  const value = attributeText(node, name)?.trim();
  return value ? value : undefined;
}

/**
 * `<PlatformCode>` keeps every variant as a labeled fenced block, so the agent-facing
 * Markdown holds the Windows command too and not only the `posix` shortcut.
 */
function platformCodeMarkdown(node: JsxNode): string | undefined {
  const shared = trimmedAttribute(node, "posix");
  const variants: { code: string | undefined; label: string; language: string }[] = [
    {
      code: trimmedAttribute(node, "windows"),
      label: "Windows (PowerShell)",
      language: "powershell",
    },
    { code: trimmedAttribute(node, "macos") ?? shared, label: "macOS", language: "bash" },
    { code: trimmedAttribute(node, "linux") ?? shared, label: "Linux", language: "bash" },
  ];

  const blocks: string[] = [];
  for (const variant of variants) {
    if (variant.code) {
      blocks.push(`**${variant.label}**\n\n${fencedBlock(variant.code, variant.language)}`);
    }
  }

  return blocks.length > 0 ? `\n${blocks.join("\n\n")}\n\n` : undefined;
}

/** Link tile with a fixed target, so its URL stays visible to agents. */
function bonderyRepoMarkdown(): string {
  return `${bullet(
    "Bondery on GitHub",
    "https://github.com/usebondery/bondery",
    "Source code, issues, and pull requests.",
  )}\n`;
}

const HANDLERS = new Map<string, (node: JsxNode, state: State, info: Info) => string | undefined>([
  ["Card", cardMarkdown],
  ["Cards", containerMarkdown],
  ["Step", stepMarkdown],
  ["Steps", stepsMarkdown],
  ["Callout", calloutMarkdown],
  ["Accordion", accordionMarkdown],
  ["Accordions", containerMarkdown],
  ["File", fileMarkdown],
  ["Folder", folderMarkdown],
  ["Files", containerMarkdown],
  ["BonderyRepo", bonderyRepoMarkdown],
  ["PlatformCode", platformCodeMarkdown],
]);

/**
 * Components that resolve data at request time. They carry no build-time props,
 * so drop the tag instead of emitting an empty JSX element.
 */
const RUNTIME_COMPONENTS = new Set(["ApiErrorsIndex", "ChangelogIndex", "OpenAPIPage"]);

/** `stringify` hook: a returned string replaces the JSX element. */
export function stringifyDocsComponent(
  node: Node,
  _parent: Parameters<Stringify>[1],
  state: State,
  info: Info,
): string | undefined {
  const jsx = asJsx(node);
  if (!jsx?.name) {
    return undefined;
  }

  return HANDLERS.get(jsx.name)?.(jsx, state, info);
}

/** `filterElement` hook: keep regular nodes, drop components with no static form. */
export const filterDocsComponent: FilterElement = (node) => {
  const jsx = asJsx(node);
  if (!jsx?.name) {
    return true;
  }

  return RUNTIME_COMPONENTS.has(jsx.name) ? false : "children-only";
};
