import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};

type DocsSearchResult = {
  breadcrumbs?: string[];
  content: string;
  id: string;
  type: "page" | "heading" | "text";
  url: string;
};

type DocsSearchTab = "develop" | "integrate" | "product" | "selfhost";

const TAB_TITLES: Record<DocsSearchTab, string> = {
  develop: docs.Tabs.Develop,
  integrate: docs.Tabs.Integrate,
  product: docs.Tabs.Product,
  selfhost: docs.Tabs.SelfHost,
};

type DocsSearchAction = {
  description?: string;
  id: string;
  label: string;
  url: string;
};

type DocsSearchGroup = {
  actions: DocsSearchAction[];
  group: string;
};

const TAB_ORDER: readonly DocsSearchTab[] = ["product", "selfhost", "integrate", "develop"];

/** Removes the `<mark>` wrappers the docs search API puts around hits. */
function stripTags(value: string): string {
  return value.replace(/<\/?mark>/gu, "");
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

function tabForDocsUrl(url: string): DocsSearchTab {
  const path = docsPathname(url);

  if (path.startsWith("/docs/deploy")) {
    return "selfhost";
  }
  if (path.startsWith("/docs/api")) {
    return "integrate";
  }
  if (path.startsWith("/docs/contributing")) {
    return "develop";
  }

  return "product";
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

function toSearchGroups(results: DocsSearchResult[]): DocsSearchGroup[] {
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

    return [{ actions, group: TAB_TITLES[tab] }];
  });
}

export type { DocsSearchAction, DocsSearchGroup, DocsSearchResult, DocsSearchTab };
export { stripTags, tabForDocsUrl, toSearchGroups };
