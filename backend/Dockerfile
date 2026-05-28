# Build context MUST be the monorepo root.
#   docker build -f backend/Dockerfile -t gpt-backend .

# ---- Builder ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Copy the whole monorepo. .dockerignore excludes node_modules / dist /
# overwolf-app / .git etc., so this stays reasonably small. This avoids the
# trap of partial COPYs missing a workspace npm needs.
COPY . .

# Verbose, single-shot install + build. Anything that fails here prints with
# context (`set -ex`) — much easier to diagnose than a bare `npm ci`.
RUN set -ex \
 && node --version \
 && npm --version \
 && ls -la \
 && npm ci --no-audit --no-fund --ignore-scripts \
 && npm run build --workspace shared \
 && cd backend \
 && npx prisma generate \
 && npm run build \
 && mkdir -p /app/backend/node_modules
# ^ npm hoists differently between incremental and clean installs. The runner
# stage COPYs backend/node_modules unconditionally; ensure it exists (even
# empty) so the build doesn't error when every dep ended up hoisted to root.

# ---- Runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl wget tini \
 && rm -rf /var/lib/apt/lists/*

# We don't reinstall in the runner — we just lift the production-needed bits
# out of the builder's tree. node_modules from the builder already contains
# every dep (including dev), but the bundle is small and copies fast inside
# Docker's layer system. If image size matters more than build time, swap
# this for a `npm ci --omit=dev` after copying the manifests.
COPY --from=builder /app/package.json        /app/package-lock.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist         ./shared/dist/
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist         ./backend/dist/
COPY --from=builder /app/backend/prisma       ./backend/prisma/
COPY --from=builder /app/node_modules         ./node_modules/
# Some deps (otplib v12, @otplib/core) refuse to hoist to the root node_modules
# because they conflict with versions npm pinned for other consumers. They end
# up at backend/node_modules instead. Without this COPY they're missing at runtime.
COPY --from=builder /app/backend/node_modules ./backend/node_modules/

WORKDIR /app/backend
EXPOSE 4000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
