/**
 * Template for new PostHog product events.
 * Copy patterns — do not import this file from production code.
 *
 * Naming: category:object_action (PostHog convention)
 * @see references/naming-and-schema.md (bondery-analytics skill)
 */

// Client component (after mutation success):
// import { captureEvent } from "@/lib/analytics/client";
//
// captureEvent("contacts:contact_create");
//
// captureEvent("interactions:interaction_create", {
//   activity_type: type,
//   participant_count: participantIds.length,
// });

// Server action / route handler (authoritative / growth events):
// import { captureServerEvent } from "@/lib/analytics/server";
//
// captureServerEvent(userId, "signup_flow:user_create", {
//   signup_method: "email",
// });

// Bad — dynamic event name
// captureEvent(`navigation:page_view_${path}`);
//
// Good — static name, variable in property
// captureEvent("navigation:page_view", { page_name: path });
