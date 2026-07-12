import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOutServerSession } from "@/lib/auth/resolveServerSession";
import { buildLoginUrl, getRequestReturnPathForLogin } from "@/lib/auth/returnIntent";

/**
 * Clears Supabase auth cookies and redirects to login when the API reports
 * an expired or invalid session. Server-side counterpart to handleUnauthorizedSession.
 */
export async function handleServerUnauthorizedSession(returnPath?: string): Promise<never> {
  await signOutServerSession();

  const headersList = await headers();
  const destination = buildLoginUrl(returnPath ?? getRequestReturnPathForLogin(headersList));
  redirect(destination);
}
