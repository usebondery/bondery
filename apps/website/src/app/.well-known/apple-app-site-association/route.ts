import { buildAppleAppSiteAssociation } from "@bondery/helpers/auth/associated-domains";
import { getIosAppTeamId } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Apple associated domains for native passkeys (`webcredentials`) and universal
 * links (`applinks`). Returns 404 when `BONDERY_PUBLIC_IOS_APP_TEAM_ID` is unset
 * so we never invent a Team ID.
 */
export function GET() {
  const document = buildAppleAppSiteAssociation({
    teamId: getIosAppTeamId(),
  });

  if (!document) {
    return new Response(null, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 404,
    });
  }

  return Response.json(document, {
    headers: {
      "Cache-Control": "max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
