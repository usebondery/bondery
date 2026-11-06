export type DocsSearchResult = {
  breadcrumbs?: string[];
  content: string;
  id: string;
  type: "page" | "heading" | "text";
  url: string;
};

export type DocsSearchTab = "Develop" | "How to use Bondery" | "Integrate" | "Self-host";

export type DocsSearchAction = {
  description?: string;
  id: string;
  label: string;
  url: string;
};

export type DocsSearchGroup = {
  actions: DocsSearchAction[];
  group: string;
};

const TAB_ORDER: readonly DocsSearchTab[] = [
  "How to use Bondery",
  "Self-host",
  "Integrate",
  "Develop",
];

/** Removes the `<mark>` wrappers the docs search API puts around hits. */
export function stripTags(value: string): string {
  return value.replace(/<\/?mark>/g, "");
}

function docsPathname(url: string): string {
  if (url.startsWith("/")) {
    return url;
  }

  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function tabForDocsUrl(url: string): DocsSearchTab {
  const path = docsPathname(url);

  if (path.startsWith("/docs/deploy")) {
    return "Self-host";
  }
  if (path.startsWith("/docs/api")) {
    return "Integrate";
  }
  if (path.startsWith("/docs/contributing")) {
    return "Develop";
  }

  return "How to use Bondery";
}

function actionForResult(result: DocsSearchResult): DocsSearchAction {
  const pageLabel = result.type === "page";
  const label = pageLabel
    ? stripTags(result.content)
    : stripTags(result.breadcrumbs?.[0] ?? result.url);

  if (pageLabel) {
    return {
      id: result.id,
      label,
      url: result.url,
    };
  }

  return {
    description: stripTags(result.content),
    id: result.id,
    label,
    url: result.url,
  };
}

export function toSearchGroups(results: DocsSearchResult[]): DocsSearchGroup[] {
  const grouped = new Map<DocsSearchTab, DocsSearchAction[]>();

  for (const result of results) {
    const tab = tabForDocsUrl(result.url);
    const actions = grouped.get(tab);
    const action = actionForResult(result);

    if (actions) {
      actions.push(action);
    } else {
      grouped.set(tab, [action]);
    }
  }

  return TAB_ORDER.flatMap((tab) => {
    const actions = grouped.get(tab);
    if (!actions || actions.length === 0) {
      return [];
    }

    return [{ actions, group: tab }];
  });
}
