"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@mantine/core";
import { nprogress, NavigationProgress } from "@mantine/nprogress";
import {
  completeOnboarding as completeOnboardingRequest,
  updateImportFollowup,
} from "@/lib/api/domains/settings";
import type { ImportFollowupPlatform } from "@bondery/schemas";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { OnboardingProvider } from "./OnboardingContext";
import { StepLoading } from "./steps/StepLoading";
import { StepWelcome } from "./steps/StepWelcome";
import { StepIntent } from "./steps/StepIntent";
import { StepImport } from "./steps/StepImport";

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
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    nprogress.set(STEP_PROGRESS[step] ?? 0);
  }, [step]);

  const nextStep = useCallback(() => {
    setStep((s) => s + 1);
  }, []);

  const finishOnboarding = useCallback(
    async (followup?: {
      status: "awaiting_export" | "dismissed";
      platform?: ImportFollowupPlatform;
    }) => {
      if (isCompleting) return;
      setIsCompleting(true);
      nprogress.set(100);
      try {
        if (followup) {
          await updateImportFollowup(followup);
        }
        await completeOnboardingRequest();
        router.push(WEBAPP_ROUTES.HOME);
      } catch {
        setIsCompleting(false);
      }
    },
    [router, isCompleting],
  );

  const handleAwaitingExportFromModal = useCallback(
    async (platform: ImportFollowupPlatform) => {
      await finishOnboarding({ status: "awaiting_export", platform });
    },
    [finishOnboarding],
  );

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
            onComplete={() => void finishOnboarding()}
            onSkipImport={() => void finishOnboarding({ status: "dismissed" })}
            onAwaitingExportFromModal={handleAwaitingExportFromModal}
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
        opened
        onClose={() => {}}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        centered
        size="lg"
        radius="lg"
        padding="xl"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        title={undefined}
      >
        {renderStep()}
      </Modal>
    </>
  );
}

export function OnboardingFlow() {
  return (
    <OnboardingProvider>
      <OnboardingFlowContent />
    </OnboardingProvider>
  );
}
