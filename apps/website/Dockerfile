# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV TURBO_TELEMETRY_DISABLED=1

FROM base AS prune
COPY . .
RUN npx --yes turbo@2.10.4 prune website --docker

FROM base AS builder
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/package-lock.json ./package-lock.json
COPY --from=prune /app/out/full/ .
COPY scripts ./scripts
COPY docs ./docs
ENV npm_config_ignore_scripts=true
# Placeholder public env vars for build-time check-env / static generation only.
# Runtime injects real BONDERY_PUBLIC_* via deploy/ops Compose.
ENV BONDERY_PUBLIC_WEBAPP_URL=https://app.example.com
ENV BONDERY_PUBLIC_WEBSITE_URL=https://example.com
RUN npm ci
RUN npx turbo build --filter=website
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app

ARG BONDERY_INFRA_GIT_SHA
ARG BUILD_DATE

ENV NODE_ENV=production
ENV PORT=26630
ENV BONDERY_INFRA_GIT_SHA=$BONDERY_INFRA_GIT_SHA
ENV BUILD_DATE=$BUILD_DATE

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/website/package.json ./apps/website/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/website/.next ./apps/website/.next
COPY --from=builder --chown=nodejs:nodejs /app/apps/website/public ./apps/website/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/website/content ./apps/website/content
COPY --from=builder --chown=nodejs:nodejs /app/apps/website/next.config.ts ./apps/website/next.config.ts
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

USER nodejs
EXPOSE 26630

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:26630/api/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "-w", "website"]
