import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { redirect } from "next/navigation";
import { signOutServerSession } from "@/lib/auth/resolveServerSession";

/**
 * Clears Supabase auth cookies and redirects to login when the API reports
 * an expired or invalid session. Server-side counterpart to handleUnauthorizedSession.
 */
export async function handleServerUnauthorizedSession(): Promise<never> {
  await signOutServerSession();
  redirect(WEBSITE_ROUTES.LOGIN);
}
