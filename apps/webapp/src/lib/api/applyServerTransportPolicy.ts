import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isApiUnavailableError, isApiUnavailableResponseStatus } from "@/lib/api/availability";
import { handleServerUnauthorizedSession } from "@/lib/auth/handleServerUnauthorizedSession";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";
import {
  buildUnavailableUrl,
  getRequestReturnPath,
  getRequestReturnPathForLogin,
  parseReturnIntent,
} from "@/lib/auth/returnIntent";
import { isUnauthorizedApiError, isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";

async function getPathname(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-pathname") ?? "";
}

function isOnUnavailableRoute(pathname: string): boolean {
  return pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE);
}

function isOnLoginRoute(pathname: string): boolean {
  return pathname.startsWith(WEBSITE_ROUTES.LOGIN);
}

async function hasValidServerSession(): Promise<boolean> {
  const session = await resolveServerSession();
  return session.status === "ok";
}

async function applyUnauthorizedPolicy(errorToRethrow?: unknown): Promise<never> {
  const pathname = await getPathname();
  if (isOnLoginRoute(pathname)) {
    if (errorToRethrow !== undefined) {
      throw errorToRethrow;
    }
    redirect(WEBSITE_ROUTES.LOGIN);
  }

  const headersList = await headers();

  if (isOnUnavailableRoute(pathname)) {
    const search = headersList.get("x-search") ?? "";
    const forwardedRedirect = parseReturnIntent(
      new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    );
    if (forwardedRedirect) {
      return handleServerUnauthorizedSession(forwardedRedirect);
    }
  }

  return handleServerUnauthorizedSession(getRequestReturnPathForLogin(headersList));
}

async function applyUnavailablePolicy(error: unknown): Promise<never> {
  const pathname = await getPathname();
  if (isOnUnavailableRoute(pathname)) {
    throw error;
  }

  if (!(await hasValidServerSession())) {
    return applyUnauthorizedPolicy(error);
  }

  const headersList = await headers();
  redirect(buildUnavailableUrl(getRequestReturnPath(headersList)));
}

/** Apply global session/outage policy for thrown transport errors (server RSC). */
export async function applyServerTransportErrorPolicy(error: unknown): Promise<never> {
  if (isUnauthorizedApiError(error)) {
    return applyUnauthorizedPolicy(error);
  }

  if (isApiUnavailableError(error)) {
    return applyUnavailablePolicy(error);
  }

  throw error;
}

/** Apply global session/outage policy for raw fetch Response objects (server RSC). */
export async function applyServerTransportResponsePolicy(response: Response): Promise<void> {
  if (isUnauthorizedResponseStatus(response.status)) {
    await applyUnauthorizedPolicy();
    return;
  }

  if (!isApiUnavailableResponseStatus(response.status)) {
    return;
  }

  const pathname = await getPathname();
  if (isOnUnavailableRoute(pathname)) {
    return;
  }

  if (!(await hasValidServerSession())) {
    await applyUnauthorizedPolicy();
    return;
  }

  const headersList = await headers();
  redirect(buildUnavailableUrl(getRequestReturnPath(headersList)));
}
