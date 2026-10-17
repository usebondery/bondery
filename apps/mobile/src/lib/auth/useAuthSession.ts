import { authClient } from "./client";

export function useAuthSession() {
  if (!authClient) {
    throw new Error("Auth client is not configured");
  }
  return authClient.useSession();
}
