# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV TURBO_TELEMETRY_DISABLED=1

FROM base AS prune
COPY . .
RUN npx --yes turbo@2.10.4 prune webapp --docker

FROM base AS builder
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/package-lock.json ./package-lock.json
COPY --from=prune /app/out/full/ .
COPY scripts ./scripts
COPY docs ./docs
ENV npm_config_ignore_scripts=true
# Placeholder public env vars for build-time static generation only.
# Runtime reads BONDERY_PUBLIC_* via runtimeConfig.server.ts (never build-inlined).
ENV BONDERY_PUBLIC_API_URL=https://api.example.com
ENV BONDERY_PUBLIC_WEBAPP_URL=https://app.example.com
ENV BONDERY_PUBLIC_WEBSITE_URL=https://example.com
ENV BONDERY_PUBLIC_SUPABASE_URL=https://example.supabase.co
ENV BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY=build-placeholder
RUN npm ci
RUN npx turbo build --filter=webapp
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app

ARG BONDERY_INFRA_VERSION
ARG BONDERY_INFRA_GIT_SHA
ARG BUILD_DATE

ENV NODE_ENV=production
ENV PORT=26632
ENV BONDERY_INFRA_VERSION=$BONDERY_INFRA_VERSION
ENV BONDERY_INFRA_GIT_SHA=$BONDERY_INFRA_GIT_SHA
ENV BUILD_DATE=$BUILD_DATE

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/webapp/package.json ./apps/webapp/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/webapp/.next ./apps/webapp/.next
COPY --from=builder --chown=nodejs:nodejs /app/apps/webapp/public ./apps/webapp/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/webapp/next.config.ts ./apps/webapp/next.config.ts
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

USER nodejs
EXPOSE 26632

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:26632/api/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "-w", "webapp"]

