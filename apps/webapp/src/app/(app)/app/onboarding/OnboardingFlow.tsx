"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@mantine/core";
import { nprogress, NavigationProgress } from "@mantine/nprogress";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { API_URL } from "@/lib/config";
import { OnboardingProvider, useOnboardingContext } from "./OnboardingContext";
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
  const t = useTranslations("Onboarding");
  const { seedPromise } = useOnboardingContext();
  const [step, setStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    nprogress.set(STEP_PROGRESS[step] ?? 0);
  }, [step]);

  const nextStep = useCallback(() => {
    setStep((s) => s + 1);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    nprogress.set(100);
    try {
      // Wait for seeding to finish so the home page renders with data.
      // Cap at 15 s to avoid blocking indefinitely on network failures.
      if (seedPromise) {
        const timeout = new Promise<void>((resolve) => setTimeout(resolve, 15_000));
        await Promise.race([seedPromise, timeout]);
      }
      await fetch(`${API_URL}${API_ROUTES.ME_ONBOARDING_COMPLETE}`, {
        method: "PATCH",
        credentials: "include",
      });
      router.push(WEBAPP_ROUTES.HOME);
    } catch {
      setIsCompleting(false);
    }
  }, [router, isCompleting, seedPromise]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepLoading onNext={nextStep} />;
      case 1:
        return <StepWelcome onNext={nextStep} />;
      case 2:
        return <StepIntent onNext={nextStep} />;
      case 3:
        return <StepImport onNext={completeOnboarding} onSkip={completeOnboarding} />;
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
