import type { ReactNode } from "react";
import { PreloadedLocaleProvider } from "@/lib/i18n/PreloadedLocaleProvider";

export default function ConfirmLayout({ children }: { children: ReactNode }) {
  return <PreloadedLocaleProvider groups={["web.login"]}>{children}</PreloadedLocaleProvider>;
}
