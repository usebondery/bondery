import { buildApiErrorFromResponse } from "@bondery/helpers/api";
import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { headers } from "next/headers";
import { isApiUnavailableError, isApiUnavailableResponseStatus } from "@/lib/api/availability";
import { handleServerUnauthorizedSession } from "@/lib/auth/handleServerUnauthorizedSession";
import { getRequestReturnPathForLogin, parseReturnIntent } from "@/lib/auth/returnIntent";
import { isUnauthorizedApiError, isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";
import { redirectRoute } from "@/lib/navigation/redirect/route";
import { routeAssert } from "@/lib/navigation/route/assert";

async function getPathname(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-pathname") ?? "";
}

function isOnLoginRoute(pathname: string): boolean {
  return pathname.startsWith(WEBSITE_ROUTES.LOGIN);
}

function isOnUnavailableRoute(pathname: string): boolean {
  return pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE);
}

async function applyUnauthorizedPolicy(errorToRethrow?: unknown): Promise<never> {
  const pathname = await getPathname();
  if (isOnLoginRoute(pathname)) {
    if (errorToRethrow !== undefined) {
      throw errorToRethrow;
    }
    redirectRoute(routeAssert(WEBAPP_ROUTES.LOGIN));
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

  return handleServerUnauthorizedSession(getRequestReturnPathForLogin(headersList) ?? undefined);
}

async function applyUnavailablePolicy(error: unknown): Promise<never> {
  if (error instanceof Error) {
    throw error;
  }
  throw new Error("Service unavailable");
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

  const text = await response.text();
  throw buildApiErrorFromResponse({
    bodyText: text,
    status: response.status,
  });
}
