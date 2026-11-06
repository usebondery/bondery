"use client";

import { CodeHighlightAdapterProvider, createHighlightJsAdapter } from "@mantine/code-highlight";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import type { ReactNode } from "react";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("powershell", powershell);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("yaml", yaml);

const highlightJsAdapter = createHighlightJsAdapter(hljs);

type CodeHighlightProviderProps = {
  children: ReactNode;
};

/** Shared highlight.js adapter for `CodeBlock`. Webapp and docs use this provider. */
export function CodeHighlightProvider({ children }: CodeHighlightProviderProps) {
  return (
    <CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
      {children}
    </CodeHighlightAdapterProvider>
  );
}
