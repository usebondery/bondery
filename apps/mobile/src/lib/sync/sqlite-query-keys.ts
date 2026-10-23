import type { ContactsListParams } from "../resources/contacts";

export const sqliteQueryKeys = {
  contacts: {
    all: ["sqlite", "contacts"] as const,
    dates: (contactId: string) => ["sqlite", "contacts", "dates", contactId] as const,
    detail: (contactId: string) => ["sqlite", "contacts", "detail", contactId] as const,
    groups: (contactId: string) => ["sqlite", "contacts", "groups", contactId] as const,
    list: (params: ContactsListParams) =>
      [
        "sqlite",
        "contacts",
        "list",
        {
          excludeMyself: params.excludeMyself ?? false,
          groupId: params.groupId ?? null,
          limit: params.limit ?? null,
          offset: params.offset ?? null,
          query: params.query ?? "",
        },
      ] as const,
    myself: () => ["sqlite", "contacts", "myself"] as const,
    tags: (contactId: string) => ["sqlite", "contacts", "tags", contactId] as const,
  },
  groups: {
    all: ["sqlite", "groups"] as const,
    list: () => ["sqlite", "groups", "list"] as const,
    members: (groupId: string) => ["sqlite", "groups", "members", groupId] as const,
  },
  root: ["sqlite"] as const,
  tags: {
    all: ["sqlite", "tags"] as const,
    list: () => ["sqlite", "tags", "list"] as const,
  },
} as const;
