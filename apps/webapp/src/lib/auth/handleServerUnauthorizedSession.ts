import { headers } from "next/headers";
import { signOutServerSession } from "@/lib/auth/resolveServerSession";
import type { SafeAppReturnPath } from "@/lib/auth/returnIntent";
import { getRequestReturnPathForLogin } from "@/lib/auth/returnIntent";
import { redirectRoute } from "@/lib/navigation/redirect/route";
import { routeLogin } from "@/lib/navigation/route/login";

/**
 * Clears the webapp session and redirects to login when the API reports
 * an expired or invalid session. Server-side counterpart to handleUnauthorizedSession.
 */
export async function handleServerUnauthorizedSession(
  returnPath?: SafeAppReturnPath,
): Promise<never> {
  await signOutServerSession();

  const headersList = await headers();
  redirectRoute(routeLogin(returnPath ?? getRequestReturnPathForLogin(headersList)));
}
