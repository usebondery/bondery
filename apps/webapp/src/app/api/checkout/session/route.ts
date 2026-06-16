import { NextResponse } from "next/server";
import { polar, POLAR_PRODUCT_ID } from "@/lib/polar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WEBAPP_URL } from "@/lib/config";

/**
 * Polar locales supported as of the current SDK version.
 * Unknown values are silently coerced to "en" to avoid Polar API rejections.
 */
const SUPPORTED_POLAR_LOCALES = [
  "en",
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "nl",
  "pl",
  "pt",
  "sv",
  "zh",
] as const;

type PolarLocale = (typeof SUPPORTED_POLAR_LOCALES)[number];

function sanitizeLocale(lang: string | null): PolarLocale {
  const normalized = (lang ?? "en").toLowerCase().split("-")[0];
  return (SUPPORTED_POLAR_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as PolarLocale)
    : "en";
}

/**
 * POST /api/checkout/session
 *
 * Creates a short-lived Polar checkout session for the authenticated user.
 * Returns the session URL which is passed directly to PolarEmbedCheckout.create()
 * on the client side.
 *
 * - customerEmail is pre-filled from the authenticated user's session.
 * - embedOrigin is locked to NEXT_PUBLIC_WEBAPP_URL so Polar's iframe will only
 *   postMessage to this exact origin.
 * - Returns 409 if the user already has an active or canceling subscription.
 * - successUrl is intentionally omitted so event.detail.redirect is false and
 *   the embed hook handles all post-success logic in-app.
 */
export async function POST(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!POLAR_PRODUCT_ID) {
    console.error("POLAR_PRODUCT_ID is not configured");
    return NextResponse.json(
      { error: "Checkout not configured" },
      { status: 500 },
    );
  }

  // Double-purchase guard: prevent creating a checkout for an already-subscribed user
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (existing?.status === "active" || existing?.status === "canceling") {
    return NextResponse.json({ error: "AlreadySubscribed" }, { status: 409 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("language")
    .eq("user_id", user.id)
    .single();

  try {
    const session = await polar.checkouts.create({
      products: [POLAR_PRODUCT_ID],
      customerEmail: user.email ?? undefined,
      embedOrigin: WEBAPP_URL,
      externalCustomerId: user.id,
      locale: sanitizeLocale(settings?.language ?? null),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Failed to create Polar checkout session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
