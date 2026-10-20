import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Route } from "next";

export function routeChatSession(sessionId: string): Route {
  return `${WEBAPP_ROUTES.CHAT}/${sessionId}` as Route;
}
