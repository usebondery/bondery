"use client";

import type { ContactSelectable } from "@bondery/schemas";
import { GettingStartedProgressRail } from "@/components/home/GettingStartedProgressRail";
import { GettingStartedRailSkeleton } from "@/components/home/GettingStartedRailSkeleton";

interface GettingStartedRailSlotProps {
  hasInteraction: boolean;
  hasInteractionReady: boolean;
  initialSettings?: Record<string, unknown>;
  settingsData?: Record<string, unknown>;
  settingsReady: boolean;
  statsReady: boolean;
  timelineContacts: ContactSelectable[];
  totalContacts: number;
}

export function GettingStartedRailSlot({
  hasInteraction,
  hasInteractionReady,
  initialSettings,
  settingsData,
  settingsReady,
  statsReady,
  timelineContacts,
  totalContacts,
}: GettingStartedRailSlotProps) {
  const resolvedSettings = settingsData ?? initialSettings;
  const railReady = settingsReady && statsReady && hasInteractionReady && resolvedSettings != null;

  if (!railReady) {
    return <GettingStartedRailSkeleton />;
  }

  return (
    <GettingStartedProgressRail
      hasInteraction={hasInteraction}
      settingsData={resolvedSettings}
      timelineContacts={timelineContacts}
      totalContacts={totalContacts}
    />
  );
}
