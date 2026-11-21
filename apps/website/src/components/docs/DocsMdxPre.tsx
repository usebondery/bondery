import { isValidElement, type ReactNode } from "react";
import { DocsCodeBlock } from "@/components/docs/DocsCodeBlock";

function nodeText(node: ReactNode): string {
  const parts: string[] = [];
  const pending: ReactNode[] = [node];

  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current === "string" || typeof current === "number") {
      parts.push(String(current));
      continue;
    }

    if (Array.isArray(current)) {
      for (const child of current.slice().reverse()) {
        pending.push(child);
      }
      continue;
    }

    if (isValidElement<{ children?: ReactNode }>(current)) {
      pending.push(current.props.children);
    }
  }

  return parts.join("");
}

function codeLanguage(node: ReactNode): string {
  let current = node;

  while (isValidElement<{ children?: ReactNode; className?: string }>(current)) {
    const match = /language-([\w-]+)/.exec(current.props.className ?? "");
    if (match?.[1]) {
      return match[1];
    }

    if (!current.props.children) {
      return "text";
    }

    current = current.props.children;
  }

  return "text";
}

/** Plain MDX fence. The shared `CodeBlock` highlights the source. */
export function DocsMdxPre({ children }: { children?: ReactNode }) {
  return <DocsCodeBlock code={nodeText(children)} language={codeLanguage(children)} />;
}
