"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { ImportFollowupPlatform } from "@bondery/schemas";
import { Modal } from "@mantine/core";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFinishOnboardingMutation } from "@/lib/query/hooks/useSettings";
import { StepImport } from "./components/StepImport";
import { StepIntent } from "./components/StepIntent";
import { StepLoading } from "./components/StepLoading";
import { StepWelcome } from "./components/StepWelcome";
import { OnboardingProvider } from "./hooks/OnboardingContext";

const STEP_PROGRESS: Record<number, number> = {
  0: 10,
  1: 30,
  2: 60,
  3: 90,
};

/** Inner component rendered inside OnboardingProvider so it can read context. */
function OnboardingFlowContent() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const finishOnboardingMutation = useFinishOnboardingMutation();
  const isCompleting = finishOnboardingMutation.isPending;

  useEffect(() => {
    nprogress.set(STEP_PROGRESS[step] ?? 0);
  }, [step]);

  const nextStep = () => {
    setStep((s) => s + 1);
  };
  const finishOnboarding = async (followup?: {
    status: "awaiting_export" | "dismissed";
    platform?: ImportFollowupPlatform;
  }) => {
    if (isCompleting) {
      return;
    }
    nprogress.set(100);
    try {
      await finishOnboardingMutation.mutateAsync(followup);
      router.replace(WEBAPP_ROUTES.HOME);
      router.refresh();
    } catch {
      // isPending resets automatically; user can retry
    }
  };

  const handleAwaitingExportFromModal = async (platform: ImportFollowupPlatform) => {
    await finishOnboarding({ platform, status: "awaiting_export" });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepLoading onNext={nextStep} />;
      case 1:
        return <StepWelcome onNext={nextStep} />;
      case 2:
        return <StepIntent onNext={nextStep} />;
      case 3:
        return (
          <StepImport
            onAwaitingExportFromModal={handleAwaitingExportFromModal}
            onComplete={() => void finishOnboarding()}
            onSkipImport={() => void finishOnboarding({ status: "dismissed" })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <NavigationProgress />
      <Modal
        centered
        closeOnClickOutside={false}
        closeOnEscape={false}
        onClose={() => {}}
        opened
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        padding="xl"
        radius="lg"
        size="lg"
        title={undefined}
        withCloseButton={false}
      >
        {renderStep()}
      </Modal>
    </>
  );
}

export function OnboardingClient() {
  return (
    <OnboardingProvider>
      <OnboardingFlowContent />
    </OnboardingProvider>
  );
}
