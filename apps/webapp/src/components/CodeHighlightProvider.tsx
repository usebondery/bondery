"use client";

import { CodeHighlightAdapterProvider, createHighlightJsAdapter } from "@mantine/code-highlight";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import plaintext from "highlight.js/lib/languages/plaintext";
import powershell from "highlight.js/lib/languages/powershell";
import type { ReactNode } from "react";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("powershell", powershell);

const highlightJsAdapter = createHighlightJsAdapter(hljs);

interface CodeHighlightProviderProps {
  children: ReactNode;
}

export function CodeHighlightProvider({ children }: CodeHighlightProviderProps) {
  return (
    <CodeHighlightAdapterProvider adapter={highlightJsAdapter}>{children}</CodeHighlightAdapterProvider>
  );
}
