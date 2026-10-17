import type { ReactNode } from "react";
import { InputWrapper } from "../../../components/ui/InputWrapper";
import { useMobileSettingsTranslations } from "../../../lib/i18n/generated/hooks";

interface SettingsPreviewSectionProps {
  children: ReactNode;
  description: string;
}

export function SettingsPreviewSection({ children, description }: SettingsPreviewSectionProps) {
  const tMobileSettings = useMobileSettingsTranslations();

  return (
    <InputWrapper description={description} label={tMobileSettings("Preview")}>
      {children}
    </InputWrapper>
  );
}
