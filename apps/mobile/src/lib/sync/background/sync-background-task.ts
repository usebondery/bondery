import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { schedulePull } from "../pull-manager";
import { pushSync } from "../outbox/sync-worker";

export const SYNC_BACKGROUND_TASK = "bondery-sync";

TaskManager.defineTask(SYNC_BACKGROUND_TASK, async () => {
  try {
    await pushSync();
    await schedulePull({ reason: "background" });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerSyncBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_BACKGROUND_TASK);
  if (isRegistered) return;

  await BackgroundTask.registerTaskAsync(SYNC_BACKGROUND_TASK, {
    minimumInterval: 15,
  });
}

export async function unregisterSyncBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_BACKGROUND_TASK);
  if (!isRegistered) return;
  await BackgroundTask.unregisterTaskAsync(SYNC_BACKGROUND_TASK);
}
