import type { ImportFollowupPlatform, ImportFollowupStatus } from "@bondery/schemas";



export type GettingStartedTaskId =

  | "importContacts"

  | "addContacts"

  | "logInteraction";



export interface GettingStartedSettings {

  importFollowupStatus: ImportFollowupStatus | null;

  importFollowupPlatform: ImportFollowupPlatform | null;

  importCompletedAt: string | null;

  gettingStartedDismissedAt: string | null;

}



export interface GettingStartedTask {

  id: GettingStartedTaskId;

  isComplete: boolean;

  isAwaitingExport: boolean;

}



export interface GettingStartedState {

  tasks: GettingStartedTask[];

  completedCount: number;

  totalCount: number;

  showRail: boolean;

}



export function parseGettingStartedSettings(

  data?: Record<string, unknown>,

): GettingStartedSettings {

  const status = data?.importFollowupStatus;

  const platform = data?.importFollowupPlatform;



  return {

    importFollowupStatus:

      status === "awaiting_export" || status === "dismissed" ? status : null,

    importFollowupPlatform:

      platform === "linkedin" || platform === "instagram" ? platform : null,

    importCompletedAt: (data?.importCompletedAt as string | null | undefined) ?? null,

    gettingStartedDismissedAt:

      (data?.gettingStartedDismissedAt as string | null | undefined) ?? null,

  };

}



export function buildGettingStartedState(input: {

  settings: GettingStartedSettings;

  totalContacts: number;

  hasInteraction: boolean;

}): GettingStartedState {

  const { settings, totalContacts, hasInteraction } = input;



  const importComplete = settings.importCompletedAt != null;

  const importAwaiting =

    !importComplete && settings.importFollowupStatus === "awaiting_export";



  const tasks: GettingStartedTask[] = [

    {

      id: "importContacts",

      isComplete: importComplete,

      isAwaitingExport: importAwaiting,

    },

    {

      id: "addContacts",

      isComplete: totalContacts > 0,

      isAwaitingExport: false,

    },

    {

      id: "logInteraction",

      isComplete: hasInteraction,

      isAwaitingExport: false,

    },

  ];



  const completedCount = tasks.filter((task) => task.isComplete).length;



  return {

    tasks,

    completedCount,

    totalCount: tasks.length,

    showRail: settings.gettingStartedDismissedAt == null,

  };

}

