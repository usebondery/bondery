import { PLATFORM_ADMIN_ROLE, PLATFORM_USER_ROLE } from "@bondery/helpers/auth/platform-admin";
import { defaultAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

const platformAdminUserPermissions = defaultStatements.user.filter(
  (permission) => permission !== "impersonate" && permission !== "impersonate-admins",
);

/** Shared access controller for Better Auth `admin()` / `adminClient()`. */
export const platformAdminAc = defaultAc;

/** Platform operator role — impersonation permissions deliberately omitted. */
export const platformAdminRole = platformAdminAc.newRole({
  session: [...defaultStatements.session],
  user: [...platformAdminUserPermissions],
});

export const platformUserRole = userAc;

export const platformAdminRoles = {
  [PLATFORM_ADMIN_ROLE]: platformAdminRole,
  [PLATFORM_USER_ROLE]: platformUserRole,
} as const;

/** Re-export for tests that assert the statement surface stays stable. */
export { defaultStatements } from "better-auth/plugins/admin/access";
