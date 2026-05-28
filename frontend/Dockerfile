# Build context MUST be the monorepo root.
#   docker build -f frontend/Dockerfile -t gpt-frontend .

# ---- Builder ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
ARG NEXT_PUBLIC_ADSENSE_SLOT_FOOTER
ARG NEXT_PUBLIC_ADBLOCK_NOTICE
ARG NEXT_PUBLIC_OVERWOLF_DOWNLOAD_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT
ENV NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR=$NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
ENV NEXT_PUBLIC_ADSENSE_SLOT_FOOTER=$NEXT_PUBLIC_ADSENSE_SLOT_FOOTER
ENV NEXT_PUBLIC_ADBLOCK_NOTICE=$NEXT_PUBLIC_ADBLOCK_NOTICE
ENV NEXT_PUBLIC_OVERWOLF_DOWNLOAD_URL=$NEXT_PUBLIC_OVERWOLF_DOWNLOAD_URL

# Root manifest + lockfile + ALL workspace manifests (npm errors on any missing
# workspace declared in package.json's `workspaces` field).
COPY package.json package-lock.json ./
COPY shared/package.json   ./shared/
COPY shared/tsconfig.json  ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json  ./backend/

RUN npm ci --no-audit --no-fund --ignore-scripts

# Build shared first so its dist/ exists when Next resolves @gpt/shared.
COPY shared/src ./shared/src/
RUN npm run build --workspace shared

# Frontend source
COPY frontend ./frontend/

WORKDIR /app/frontend
RUN npm run build

# ---- Runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# Next standalone output is self-contained: server.js + a minimal
# node_modules + .next/static + public/.
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static     ./frontend/.next/static
COPY --from=builder /app/frontend/public           ./frontend/public

WORKDIR /app/frontend
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
