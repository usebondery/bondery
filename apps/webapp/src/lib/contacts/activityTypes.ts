import { INTERACTION_TYPES } from "@bondery/helpers";
import type { ActivityType } from "@bondery/schemas";

export type ActivityTypeConfig = {
  emoji: string;
  color: string;
};

export const ACTIVITY_TYPE_OPTIONS: ActivityType[] = INTERACTION_TYPES.filter(
  (t) => t !== "Custom",
);

const LEGACY_ACTIVITY_TYPE_ALIASES: Record<string, ActivityType> = {
  Networking: "Networking event",
  "Networking interaction": "Networking event",
};

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  Call: { color: "blue", emoji: "📞" },
  Coffee: { color: "orange", emoji: "☕" },
  "Competition/Hackathon": { color: "violet", emoji: "🏆" },
  Custom: { color: "gray", emoji: "✨" },
  Email: { color: "gray", emoji: "📧" },
  Meal: { color: "yellow", emoji: "🍽️" },
  Meeting: { color: "indigo", emoji: "👔" },
  "Networking event": { color: "teal", emoji: "🤝" },
  Note: { color: "lime", emoji: "📝" },
  Other: { color: "grape", emoji: "⭐" },
  "Party/Social": { color: "pink", emoji: "🎉" },
  "Text/Messaging": { color: "cyan", emoji: "💬" },
};

/**
 * Returns emoji/color configuration for an activity type.
 * Supports legacy values and falls back to `Other` if unknown.
 */
export function getActivityTypeConfig(type: string): ActivityTypeConfig {
  const normalizedType = LEGACY_ACTIVITY_TYPE_ALIASES[type] ?? type;
  return ACTIVITY_TYPE_CONFIG[normalizedType as ActivityType] ?? ACTIVITY_TYPE_CONFIG.Other;
}
