export { createContact } from "./create-contact.js";
export { deleteContact } from "./delete-contact.js";
export { deleteContacts } from "./delete-contacts.js";
export { getEnrichQueueEligibleCount } from "./enrichment/enrich-queue.js";
export { replaceImportantDates } from "./important-dates.js";
export { getKeepInTouchOverdueCount } from "./keep-in-touch.js";
export { mergeContacts } from "./merge.js";
export {
  declineMergeRecommendation,
  getMergeRecommendationsCount,
  patchAffectsMergeRecommendations,
  recomputeMergeRecommendations,
  refreshMergeRecommendations,
  restoreMergeRecommendation,
  scheduleMergeRecommendationsRefresh,
} from "./merge-recommendations.js";
export {
  createRelationship,
  deleteRelationship,
  updateRelationship,
} from "./relationships.js";
export { addContactTag, removeContactTag } from "./tags.js";
export { updateContact } from "./update-contact.js";
