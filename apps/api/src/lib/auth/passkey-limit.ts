/**
 * Caps passkey registration. Better Auth's passkey plugin has no max option,
 * so this hook rejects generate-register-options / verify-registration once
 * the account is at {@link PASSKEY_LIMITS.maxPerUser}.
 *
 * `hooks.before` runs before endpoint session middleware and before the
 * bearer plugin's cookie rewrite is merged onto the request, so this reads
 * `ctx.context.session` first, then an opaque Bearer session token.
 */
import { prisma } from "@bondery/db";
import { PASSKEY_LIMITS } from "@bondery/schemas";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { isJwtShapedToken } from "./bearer-token-format.js";

const BEARER_S_S_PATTERN = /^Bearer\s+(\S+)/i;

const PASSKEY_REGISTER_PATHS = new Set([
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
]);

const GENERATE_REGISTER_OPTIONS_PATH = "/passkey/generate-register-options";

function readOpaqueBearerToken(ctx: { headers?: Headers; request?: Request }): string | undefined {
  const authorization =
    ctx.headers?.get("authorization") ?? ctx.request?.headers.get("authorization") ?? "";
  const match = BEARER_S_S_PATTERN.exec(authorization);
  const token = match?.[1];
  if (!token || isJwtShapedToken(token)) {
    return undefined;
  }
  return token;
}

export function passkeyLimit() {
  return {
    hooks: {
      before: [
        {
          handler: createAuthMiddleware(async (ctx) => {
            const { query } = ctx;
            if (!query || typeof query !== "object") {
              return;
            }
            // Better Auth 1.7.1 copies GET `name` onto WebAuthn user.name
            // (password-manager username). Labels belong on verify-registration
            // / updatePasskey, not this query.
            delete (query as { name?: string }).name;
          }),
          matcher: (context: { path?: string }) => context.path === GENERATE_REGISTER_OPTIONS_PATH,
        },
        {
          handler: createAuthMiddleware(async (ctx) => {
            let userId = ctx.context.session?.user?.id;

            if (!userId) {
              const session = await getSessionFromCtx(ctx);
              userId = session?.user?.id;
            }

            if (!userId) {
              const token = readOpaqueBearerToken(ctx);
              if (token) {
                const row = await prisma.session.findUnique({
                  select: { expiresAt: true, userId: true },
                  where: { token },
                });
                if (row && row.expiresAt > new Date()) {
                  ({ userId } = row);
                }
              }
            }

            if (!userId) {
              return;
            }

            const count = await prisma.passkey.count({ where: { userId } });
            if (count >= PASSKEY_LIMITS.maxPerUser) {
              throw APIError.from("CONFLICT", {
                code: "PASSKEY_LIMIT_REACHED",
                message:
                  "You have reached the maximum number of passkeys. Delete an unused passkey to add a new one.",
              });
            }
          }),
          matcher: (context: { path?: string }) =>
            typeof context.path === "string" && PASSKEY_REGISTER_PATHS.has(context.path),
        },
      ],
    },
    id: "passkey-limit" as const,
  };
}
