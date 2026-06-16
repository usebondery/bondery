import { CustomerPortal } from "@polar-sh/nextjs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server:
    process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
  getCustomerId: async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(WEBAPP_ROUTES.SETTINGS);
    }

    // Look up the Polar customer ID from our subscriptions table
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("polar_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.polar_customer_id) {
      // User has no subscription — send them back to settings instead of crashing
      redirect(WEBAPP_ROUTES.SETTINGS);
    }

    return subscription.polar_customer_id;
  },
});
