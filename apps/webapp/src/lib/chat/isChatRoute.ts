import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

/** True for `/app/chat` and `/app/chat/:sessionId`. */
export function isChatRoute(pathname: string): boolean {
  return pathname === WEBAPP_ROUTES.CHAT || pathname.startsWith(`${WEBAPP_ROUTES.CHAT}/`);
}
