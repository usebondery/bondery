import type { ActivityType } from "@bondery/types";

export type ActivityTypeConfig = {
  emoji: string;
  color: string;
};

export const ACTIVITY_TYPE_OPTIONS: ActivityType[] = [
  "Call",
  "Coffee",
  "Email",
  "Meal",
  "Meeting",
  "Networking interaction",
  "Note",
  "Other",
  "Party/Social",
  "Text/Messaging",
  "Competition/Hackathon",
];

const LEGACY_ACTIVITY_TYPE_ALIASES: Record<string, ActivityType> = {
  Networking: "Networking interaction",
};

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  Call: { emoji: "📞", color: "blue" },
  Coffee: { emoji: "☕", color: "orange" },
  Email: { emoji: "📧", color: "gray" },
  Meal: { emoji: "🍽️", color: "yellow" },
  Meeting: { emoji: "👔", color: "indigo" },
  "Networking interaction": { emoji: "🤝", color: "teal" },
  Note: { emoji: "📝", color: "lime" },
  Other: { emoji: "⭐", color: "grape" },
  "Party/Social": { emoji: "🎉", color: "pink" },
  "Text/Messaging": { emoji: "💬", color: "cyan" },
  "Competition/Hackathon": { emoji: "🏆", color: "violet" },
  Custom: { emoji: "✨", color: "gray" },
};

/**
 * Returns emoji/color configuration for an activity type.
 * Supports legacy values and falls back to `Other` if unknown.
 */
export function getActivityTypeConfig(type: string): ActivityTypeConfig {
  const normalizedType = LEGACY_ACTIVITY_TYPE_ALIASES[type] ?? type;
  return ACTIVITY_TYPE_CONFIG[normalizedType as ActivityType] ?? ACTIVITY_TYPE_CONFIG.Other;
}
