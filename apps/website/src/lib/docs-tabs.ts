import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import type { DocsTab } from "@/components/docs/DocsTabs";

export function getDocsLayoutTabs(): DocsTab[] {
  return [
    {
      icon: "book",
      key: "product",
      title: docs.Tabs.Product,
      url: "/docs",
    },
    {
      icon: "server",
      key: "selfhost",
      title: docs.Tabs.SelfHost,
      url: "/docs/deploy/requirements",
    },
    {
      icon: "code",
      key: "integrate",
      title: docs.Tabs.Integrate,
      url: "/docs/api",
    },
    {
      icon: "tool",
      key: "develop",
      title: docs.Tabs.Develop,
      url: "/docs/contributing",
    },
  ];
}
