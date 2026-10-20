# syntax=docker/dockerfile:1

FROM node:26-slim AS base
RUN npm install -g pnpm@12.6.0
WORKDIR /app
ENV TURBO_TELEMETRY_DISABLED=1
ENV CI=true

FROM base AS prune
COPY . .
RUN pnx turbo@2.10.12 prune webapp --docker

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
# GVS + BuildKit store mounts leave bin shims pointing at missing files under
# --ignore-scripts. Keep GVS for local Next/Turbopack; disable in images.
RUN sed -i '/^enableGlobalVirtualStore:/d' pnpm-workspace.yaml
# Placeholder public env vars for build-time static generation only.
# Runtime reads BONDERY_PUBLIC_* via runtimeConfig.server.ts (never build-inlined).
ENV BONDERY_PUBLIC_API_URL=https://api.example.com
ENV BONDERY_PUBLIC_WEBAPP_URL=https://app.example.com
ENV BONDERY_PUBLIC_WEBSITE_URL=https://example.com
RUN --mount=type=cache,id=bondery-pnpm-store-v4,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --ignore-scripts --no-runtime --store-dir "${PNPM_STORE_DIR}"
# --force: a remote-cache hit skips pnpm syncInjectedDepsAfterScripts, so
# dependents cannot resolve workspace packages (TS2307 / missing scripts).
RUN --mount=type=secret,id=turbo_token \
    export TURBO_TOKEN="$(cat /run/secrets/turbo_token 2>/dev/null || true)" && \
    pnpm exec turbo build --filter=webapp --force
# Standalone output traces a portable tree under apps/webapp/.next/standalone.
# Copy public + static into that tree before the runner stage.
RUN cp -r apps/webapp/public apps/webapp/.next/standalone/apps/webapp/public \
  && cp -r apps/webapp/.next/static apps/webapp/.next/standalone/apps/webapp/.next/static

FROM node:26-slim AS runner
WORKDIR /app

ARG BONDERY_INFRA_VERSION
ARG BONDERY_INFRA_GIT_SHA
ARG BUILD_DATE

ENV NODE_ENV=production
ENV PORT=26632
ENV HOSTNAME=0.0.0.0
ENV BONDERY_INFRA_VERSION=$BONDERY_INFRA_VERSION
ENV BONDERY_INFRA_GIT_SHA=$BONDERY_INFRA_GIT_SHA
ENV BUILD_DATE=$BUILD_DATE

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app/apps/webapp/.next/standalone ./

USER nodejs
EXPOSE 26632

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:26632/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/webapp/server.js"]
