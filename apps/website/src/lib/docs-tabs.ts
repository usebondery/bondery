import type { DocsTab } from "@/components/docs/DocsTabs";

export function getDocsLayoutTabs(): DocsTab[] {
  return [
    {
      icon: "book",
      key: "product",
      title: "How to use Bondery",
      url: "/docs",
    },
    {
      icon: "server",
      key: "selfhost",
      title: "Self-host",
      url: "/docs/deploy/requirements",
    },
    {
      icon: "code",
      key: "integrate",
      title: "Integrate",
      url: "/docs/api",
    },
    {
      icon: "tool",
      key: "develop",
      title: "Develop",
      url: "/docs/contributing",
    },
  ];
}
