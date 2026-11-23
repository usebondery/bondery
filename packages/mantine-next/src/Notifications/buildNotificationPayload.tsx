import type { ReactNode } from "react";
import { NotificationMessage } from "#Notifications/NotificationMessage.js";

/**
 * A follow-up action offered inside a notification.
 *
 * Use an action when an operation changes something the user cannot see. The
 * label names the destination, such as "View merged contact".
 */
interface NotificationAction {
  label: string;
  onClick: () => void;
}

/** Props shared by every notification template. */
interface NotificationTemplateProps {
  /**
   * Optional follow-up action, rendered below the description.
   *
   * Offer one when a write succeeds but its result is not on screen, so the
   * user can reach what they just created or changed.
   */
  action?: NotificationAction;
  description: string;
  icon?: ReactNode;
  radius?: string | number;
  title: string;
}

/**
 * A Mantine `notifications.show` payload, minus the per-template color.
 *
 * A `type` alias (not an `interface`) on purpose: TypeScript gives object-literal
 * type aliases an implicit index signature, which `NotificationData` requires for
 * its `data-${string}` keys. An `interface` would be rejected there.
 */
type NotificationPayload = {
  color: string;
  icon: ReactNode;
  loading: boolean;
  message: ReactNode;
  radius: string | number;
  title: string;
};

interface BuildNotificationPayloadProps extends NotificationTemplateProps {
  color: string;
  icon: ReactNode;
  loading?: boolean;
  radius: string | number;
}

/**
 * Builds the payload shared by every notification template.
 *
 * One place owns the field mapping, so a new field (an action, a priority, a
 * progress flag) reaches every template at once and the templates only choose a
 * color, an icon, and a default radius.
 */
function buildNotificationPayload({
  action,
  color,
  description,
  icon,
  loading = false,
  radius,
  title,
}: BuildNotificationPayloadProps): NotificationPayload {
  return {
    color,
    icon,
    loading,
    message: <NotificationMessage action={action} description={description} />,
    radius,
    title,
  };
}

export type { NotificationAction, NotificationPayload, NotificationTemplateProps };
export { buildNotificationPayload };
