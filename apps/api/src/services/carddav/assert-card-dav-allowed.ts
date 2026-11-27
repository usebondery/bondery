import type { DomainAuthUser } from "../../domains/_shared/context.js";

/**
 * The single place to gate CardDAV by plan. Device create and rotate call it before they mint
 * a key. Today every signed-in user may connect devices, so it always resolves. To gate the
 * feature, throw a `DomainError` here (for example `forbidden`) and nowhere else.
 *
 * @param _user The authenticated user, whose plan the gate will read.
 */
export async function assertCardDavAllowed(_user: DomainAuthUser): Promise<void> {
  // Allowed for every plan. See the JSDoc above before you add a rule.
}
