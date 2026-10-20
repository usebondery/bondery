import type { Route } from "next";

export function routeGroup(groupId: string): Route {
  return `/app/group/${groupId}` as Route;
}
