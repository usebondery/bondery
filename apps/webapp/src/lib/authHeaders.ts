import { cookies } from "next/headers";

/**
 * Creates headers object with authentication cookies for internal API calls.
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return {
    Cookie: cookieHeader,
  };
}
