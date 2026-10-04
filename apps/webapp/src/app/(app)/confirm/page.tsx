import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getOAuthProvidersServer } from "@/lib/api/domains/server/oauth-providers";
import { firstNextSearchParam } from "@/lib/auth/authorization-server-error";
import { getLastUsedLoginMethodCookie } from "@/lib/auth/getLastUsedLoginMethodCookie";
import {
  CONFIRM_ACTION_PARAM,
  CONFIRM_TARGET_PARAM,
  HAS_RETURNED_PARAM,
  parseConfirmTarget,
  parseHasReturned,
  parseReconfirmPurpose,
} from "@/lib/auth/reconfirm";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";
import { ConfirmClient } from "./ConfirmClient";

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Step-up confirm gate: opposite of `/login`. A valid BFF session is required
 * and must stay signed in. Missing identity goes to `/login`; a bad purpose
 * goes back to Settings. Never remints the BFF cookie.
 */
export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const oauthProvidersPromise = getOAuthProvidersServer();
  const [session, lastUsedLoginMethod] = await Promise.all([
    resolveServerSession(),
    getLastUsedLoginMethodCookie(),
  ]);

  if (session.status !== "ok") {
    redirect(WEBAPP_ROUTES.LOGIN);
  }

  const purpose = parseReconfirmPurpose(firstNextSearchParam(params[CONFIRM_ACTION_PARAM]));
  if (!purpose) {
    redirect(WEBAPP_ROUTES.SETTINGS);
  }

  const oauthProviders = await oauthProvidersPromise;
  const targetId = parseConfirmTarget(firstNextSearchParam(params[CONFIRM_TARGET_PARAM]));
  const hasReturned = parseHasReturned(firstNextSearchParam(params[HAS_RETURNED_PARAM]));

  return (
    <Suspense fallback={null}>
      <ConfirmClient
        hasReturned={hasReturned}
        lastUsedLoginMethod={lastUsedLoginMethod}
        oauthProviders={oauthProviders}
        purpose={purpose}
        targetId={targetId}
      />
    </Suspense>
  );
}
