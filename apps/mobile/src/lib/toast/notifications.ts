import { createElement } from "react";
import { toast } from "sonner-native";
import { v7 as uuidv7 } from "uuid";
import { UI_TIMING_MS } from "../config";
import { AppToastBanner } from "./AppToastBanner";

export type NotificationType = "success" | "error" | "neutral" | "loading";

export interface NotificationData {
  autoClose?: number | false;
  id?: string;
  loading?: boolean;
  message?: string;
  title: string;
  type?: NotificationType;
}

export type NotificationUpdateData = NotificationData & { id: string };

type NotificationPromiseContent = Omit<NotificationData, "id">;

export interface NotificationPromiseHandlers<T> {
  error: NotificationPromiseContent | ((error: unknown) => NotificationPromiseContent);
  id?: string;
  loading: NotificationPromiseContent;
  success: NotificationPromiseContent | ((value: T) => NotificationPromiseContent);
}

/** Ids currently rendered by sonner-native. Used so `promise` can show a new toast if the loading one was dismissed. */
const activeIds = new Set<string>();

function resolveType(data: NotificationData): NotificationType {
  if (data.loading === true || data.type === "loading") {
    return "loading";
  }

  return data.type ?? "neutral";
}

function resolveDuration(data: NotificationData): number {
  if (resolveType(data) === "loading") {
    return Infinity;
  }

  if (data.autoClose === false) {
    return Infinity;
  }

  if (typeof data.autoClose === "number") {
    return data.autoClose;
  }

  return UI_TIMING_MS.toastDuration;
}

function resolvePromiseContent<T>(
  content: NotificationPromiseContent | ((value: T) => NotificationPromiseContent),
  value: T,
): NotificationPromiseContent {
  return typeof content === "function" ? content(value) : content;
}

function renderNotification(data: NotificationData, id: string): void {
  const type = resolveType(data);
  const isLoading = type === "loading";

  activeIds.add(id);

  toast.custom(
    createElement(AppToastBanner, {
      message: data.message,
      onDismiss: () => {
        hide(id);
      },
      title: data.title,
      type,
    }),
    {
      dismissible: !isLoading,
      duration: resolveDuration(data),
      id,
      onAutoClose: () => {
        activeIds.delete(id);
      },
      onDismiss: () => {
        activeIds.delete(id);
      },
    },
  );
}

function show(data: NotificationData): string {
  const id = data.id ?? uuidv7();
  renderNotification(data, id);
  return id;
}

function hide(id: string): void {
  activeIds.delete(id);
  toast.dismiss(id);
}

function update(data: NotificationUpdateData): string {
  renderNotification(data, data.id);
  return data.id;
}

function clean(): void {
  activeIds.clear();
  toast.dismiss();
}

function showSettled(id: string, content: NotificationPromiseContent): void {
  const data: NotificationData = {
    ...content,
    autoClose: content.autoClose ?? UI_TIMING_MS.toastDuration,
  };

  if (activeIds.has(id)) {
    update({ ...data, id });
    return;
  }

  show(data);
}

function promise<T>(work: Promise<T>, handlers: NotificationPromiseHandlers<T>): Promise<T> {
  const id = show({
    ...handlers.loading,
    autoClose: handlers.loading.autoClose ?? false,
    id: handlers.id,
    type: handlers.loading.type ?? "loading",
  });

  void work.then(
    (value) => {
      showSettled(id, resolvePromiseContent(handlers.success, value));
    },
    (error: unknown) => {
      showSettled(id, resolvePromiseContent(handlers.error, error));
    },
  );

  return work;
}

export const notifications = {
  clean,
  hide,
  promise,
  show,
  update,
};
