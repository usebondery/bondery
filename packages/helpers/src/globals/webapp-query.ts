import { WEBAPP_ROUTES } from "./paths.js";

/** Pending UI action after a product page loads. Not a login return path. */
export const NEXT_ACTION_PARAM = "next_action" as const;

/** Snake_case intended-action values. Key is the constant; value is the query. */
export const NEXT_ACTIONS = {
  ADD_INTERACTION: "add_interaction",
} as const;

export type NextAction = (typeof NEXT_ACTIONS)[keyof typeof NEXT_ACTIONS];

export function personPathWithNextAction(personId: string, action: NextAction): string {
  return `${WEBAPP_ROUTES.PERSON}/${personId}?${NEXT_ACTION_PARAM}=${encodeURIComponent(action)}`;
}
