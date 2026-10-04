import type { ReactNode } from "react";
import { PreloadedLocaleProvider } from "@/lib/i18n/PreloadedLocaleProvider";

export default function OAuthConsentLayout({ children }: { children: ReactNode }) {
  return <PreloadedLocaleProvider groups={["web.oauth"]}>{children}</PreloadedLocaleProvider>;
}
