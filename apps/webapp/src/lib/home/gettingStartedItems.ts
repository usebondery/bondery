import type { ImportFollowupPlatform, ImportFollowupStatus, UserSettings } from "@bondery/schemas";

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

export function parseGettingStartedSettings(data?: UserSettings): GettingStartedSettings {
  const status = data?.importFollowupStatus;

  const platform = data?.importFollowupPlatform;

  return {
    gettingStartedDismissedAt: data?.gettingStartedDismissedAt ?? null,

    importCompletedAt: data?.importCompletedAt ?? null,

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

  const importComplete =
    settings.importCompletedAt !== null && settings.importCompletedAt !== undefined;

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

    showRail:
      settings.gettingStartedDismissedAt === null ||
      settings.gettingStartedDismissedAt === undefined,
    tasks,

    totalCount: tasks.length,
  };
}
