import type { ImportFollowupPlatform, ImportFollowupStatus } from "@bondery/schemas";

export type GettingStartedTaskId = "importContacts" | "addContacts" | "logInteraction";

export interface GettingStartedSettings {
  gettingStartedDismissedAt: string | null;

  importCompletedAt: string | null;

  importFollowupPlatform: ImportFollowupPlatform | null;
  importFollowupStatus: ImportFollowupStatus | null;
}

export interface GettingStartedTask {
  id: GettingStartedTaskId;

  isAwaitingExport: boolean;

  isComplete: boolean;
}

export interface GettingStartedState {
  completedCount: number;

  showRail: boolean;
  tasks: GettingStartedTask[];

  totalCount: number;
}

export function parseGettingStartedSettings(
  data?: Record<string, unknown>,
): GettingStartedSettings {
  const status = data?.importFollowupStatus;

  const platform = data?.importFollowupPlatform;

  return {
    gettingStartedDismissedAt:
      (data?.gettingStartedDismissedAt as string | null | undefined) ?? null,

    importCompletedAt: (data?.importCompletedAt as string | null | undefined) ?? null,

    importFollowupPlatform: platform === "linkedin" || platform === "instagram" ? platform : null,
    importFollowupStatus: status === "awaiting_export" || status === "dismissed" ? status : null,
  };
}

export function buildGettingStartedState(input: {
  settings: GettingStartedSettings;

  totalContacts: number;

  hasInteraction: boolean;
}): GettingStartedState {
  const { settings, totalContacts, hasInteraction } = input;

  const importComplete = settings.importCompletedAt != null;

  const importAwaiting = !importComplete && settings.importFollowupStatus === "awaiting_export";

  const tasks: GettingStartedTask[] = [
    {
      id: "importContacts",

      isAwaitingExport: importAwaiting,

      isComplete: importComplete,
    },

    {
      id: "addContacts",

      isAwaitingExport: false,

      isComplete: totalContacts > 0,
    },

    {
      id: "logInteraction",

      isAwaitingExport: false,

      isComplete: hasInteraction,
    },
  ];

  const completedCount = tasks.filter((task) => task.isComplete).length;

  return {
    completedCount,

    showRail: settings.gettingStartedDismissedAt == null,
    tasks,

    totalCount: tasks.length,
  };
}
