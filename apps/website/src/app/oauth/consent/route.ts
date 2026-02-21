import { WEBAPP_URL } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth consent bridge for production domain.
 *
 * Supabase OAuth server may redirect users to usebondery.com/oauth/consent.
 * The actual consent UI lives in the webapp, so we forward requests there
 * while preserving all query parameters (including authorization_id).
 */
export function GET(request: NextRequest) {
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL("/oauth/consent", WEBAPP_URL);

  sourceUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  return NextResponse.redirect(targetUrl);
}
