# syntax=docker/dockerfile:1

FROM node:26-slim AS base
RUN npm install -g pnpm@12.6.0
WORKDIR /app
ENV TURBO_TELEMETRY_DISABLED=1
ENV CI=true

FROM base AS prune
COPY . .
RUN pnx turbo@2.10.12 prune api --docker

FROM base AS builder
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
ENV PNPM_STORE_DIR=/pnpm/store
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/full/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prune /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY scripts ./scripts
COPY docs ./docs
RUN --mount=type=cache,id=bondery-pnpm-store-v3,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --ignore-scripts --no-runtime --store-dir "${PNPM_STORE_DIR}"
ENV DATABASE_URL=postgresql://postgres:password@127.0.0.1:54322/bondery
RUN pnpm -r --filter "api^..." run build && pnpm --filter api run build
# Materialize a portable production tree (workspace deps resolved into node_modules).
# See https://pnpm.io/docker — injectWorkspacePackages must be true in pnpm-workspace.yaml.
RUN pnpm deploy --filter=api --prod /deploy/api
WORKDIR /deploy/api
RUN node -e "import('@bondery/db').then(() => console.log('@bondery/db resolvable'))" \
  && test -f node_modules/@bondery/db/prisma.config.ts \
  && test -f node_modules/@bondery/db/prisma/migrations/migration_lock.toml \
  && test -f node_modules/@bondery/schemas/locale/supported-locales.json \
  && test -f node_modules/@bondery/schemas/dist/locale/supported-locales.json \
  && test -f node_modules/@bondery/translations/manifest.json \
  && node -e "import('@bondery/translations/manifest').then(() => console.log('@bondery/translations/manifest resolvable'))" \
  && node -e "import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process'; const entry=createRequire(import.meta.url).resolve('prisma/build/index.js'); execFileSync(process.execPath, [entry, 'version'], {stdio:'inherit'}); console.log('prisma runnable')" \
  && sh -c 'cd node_modules/@bondery/db && DATABASE_URL=postgresql://postgres:password@127.0.0.1:54322/bondery node -e "import { createRequire } from '\''node:module'\''; import { execFileSync } from '\''node:child_process'\''; const entry=createRequire(import.meta.url).resolve('\''prisma/build/index.js'\''); execFileSync(process.execPath, [entry, '\''validate'\''], {stdio:'\''inherit'\''}); console.log('\''prisma validate from @bondery/db cwd'\'')"' \
  && node --check dist/cli/release-migrate.js \
  && node --check dist/cli/ensure-storage-buckets.js

FROM node:26-slim AS runner
WORKDIR /app

ARG BONDERY_INFRA_VERSION
ARG BONDERY_INFRA_GIT_SHA

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV PORT=26631
ENV BONDERY_INFRA_VERSION=$BONDERY_INFRA_VERSION
ENV BONDERY_INFRA_GIT_SHA=$BONDERY_INFRA_GIT_SHA

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /deploy/api/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /deploy/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /deploy/api/package.json ./apps/api/package.json

USER nodejs
EXPOSE 26631

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:26631/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Required env is validated at process start (assertRequiredEnvAtStartup in index.ts)
# before Fastify listens — fails with named missing vars (same list as scripts/check-env.ts).
CMD ["node", "apps/api/dist/index.js"]
