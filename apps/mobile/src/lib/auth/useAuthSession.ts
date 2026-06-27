import { useAuth } from "./useAuth";

/**
 * @deprecated Use `useAuth` from `./useAuth` instead.
 */
export function useAuthSession() {
  const { session, isLoadingSession } = useAuth();
  return { session, isLoadingSession };
}
