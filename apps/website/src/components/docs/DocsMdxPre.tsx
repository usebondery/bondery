import { isValidElement, type ReactNode } from "react";
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(nodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeText(node.props.children);
  }

  return "";
}

function codeLanguage(node: ReactNode): string {
  if (!isValidElement<{ children?: ReactNode; className?: string }>(node)) {
    return "text";
  }

  const match = /language-([\w-]+)/.exec(node.props.className ?? "");
  if (match?.[1]) {
    return match[1];
  }

  if (node.props.children) {
    return codeLanguage(node.props.children);
  }

  return "text";
}

/** Plain MDX fence. The shared `CodeBlock` highlights the source. */
export function DocsMdxPre({ children }: { children?: ReactNode }) {
  return <DocsCodeBlock code={nodeText(children)} language={codeLanguage(children)} />;
}
