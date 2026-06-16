import type { Metadata } from "next";

export const metadata: Metadata = { title: "Onboarding" };

/**
 * Onboarding layout — the Modal overlay handles positioning.
 * Inherits auth and locale context from the parent app layout.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
