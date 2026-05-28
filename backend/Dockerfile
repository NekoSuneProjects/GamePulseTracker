# Build context MUST be the monorepo root, not ./backend. The backend depends
# on the `@gpt/shared` workspace and the root package.json declares all three
# workspaces (shared/backend/frontend) — any missing one makes npm error.
#
#   docker build -f backend/Dockerfile -t gpt-backend .

# ---- Builder ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
# debian-slim gives us a glibc base. argon2 + prisma engines have prebuilt
# binaries for it on amd64 and arm64, so QEMU cross-builds don't need to
# compile from source.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Root manifest + lockfile + ALL workspace manifests. npm errors on any
# workspace listed in package.json that's missing on disk.
COPY package.json package-lock.json ./
COPY shared/package.json   ./shared/
COPY shared/tsconfig.json  ./shared/
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/

# Prisma schema is needed before install so `prisma generate` (run below) works.
COPY backend/prisma ./backend/prisma/

# Deterministic install. --ignore-scripts skips the shared `prepare` hook
# (tsc isn't fetched yet anyway) — we run the builds explicitly below.
RUN npm ci --no-audit --no-fund --ignore-scripts

# Source for shared + backend (NOT frontend — we don't build it here).
COPY shared/src ./shared/src/
COPY backend/tsconfig.json backend/nest-cli.json ./backend/
COPY backend/src ./backend/src/

# Order: shared → prisma generate → backend nest build.
RUN npm run build --workspace shared \
 && cd backend && npx prisma generate && npm run build

# ---- Runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl wget tini \
 && rm -rf /var/lib/apt/lists/*

# Same manifest set — npm needs every declared workspace.
COPY package.json package-lock.json ./
COPY shared/package.json   ./shared/
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/
COPY backend/prisma ./backend/prisma/

# Production-only install. --ignore-scripts skips backend's `prisma generate`
# postinstall — we copy the generated client from the builder instead.
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts

# npm hoists deps to the root node_modules in a monorepo, so the prisma
# generated client lives at /app/node_modules, NOT /app/backend/node_modules.
COPY --from=builder /app/shared/dist           ./shared/dist/
COPY --from=builder /app/backend/dist          ./backend/dist/
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma/

WORKDIR /app/backend
EXPOSE 4000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
