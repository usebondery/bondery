import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { resolveServerSession, signOutServerSession } from "@/lib/auth/resolveServerSession";
import { LoginClient } from "./LoginClient";

/**
 * Login route gate: validated sessions redirect to the app before the login UI
 * renders. Stale or missing sessions clear auth cookies and show the login form.
 */
export default async function LoginPage() {
  const session = await resolveServerSession();

  if (session.status === "ok") {
    redirect(WEBAPP_ROUTES.HOME);
  }

  // Drop stale JWT cookies (e.g. user deleted in Supabase) so middleware
  // getClaims() does not treat the session as live on the next navigation.
  await signOutServerSession();

  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
