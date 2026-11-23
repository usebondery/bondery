import classes from "./recommendationCardLayout.module.css";

/**
 * Class names for the recommendation card layout, shared by every card on the
 * Fix & merge page.
 *
 * A CSS module type is an index signature, so `noPropertyAccessFromIndexSignature`
 * rejects `styles.layout` while the Biome rule rejects `styles["layout"]`. An
 * explicit shape is the one form both accept.
 */
export const cardStyles = classes as {
  actions: string;
  content: string;
  layout: string;
  people: string;
};
