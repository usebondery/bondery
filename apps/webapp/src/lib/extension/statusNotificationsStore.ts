import { createNotificationsStore } from "@mantine/notifications";

/**
 * Dedicated Mantine notifications store for the bottom-right status tray.
 *
 * Kept separate from the default store so status notifications appear at a
 * different position without interfering with the regular top-center toasts.
 */
export const statusNotificationsStore = createNotificationsStore();
