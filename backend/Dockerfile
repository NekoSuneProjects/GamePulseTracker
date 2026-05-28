# Build context MUST be the monorepo root, not ./backend. The backend depends
# on the `@gpt/shared` workspace next to it and cannot be built in isolation.
#
#   docker build -f backend/Dockerfile -t gpt-backend .

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl

# Workspace manifests + lockfile first, for max cache reuse.
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Copy prisma schema before install — backend's postinstall runs `prisma generate`.
COPY backend/prisma ./backend/prisma/

# Install all workspace deps. `shared`'s `prepare` script also runs `tsc`, but
# its src isn't here yet — we re-run shared's build below after copying source.
RUN npm install --no-audit --no-fund --ignore-scripts

# Now copy source for shared + backend and build both.
COPY shared/src ./shared/src/
COPY backend/tsconfig.json backend/nest-cli.json ./backend/
COPY backend/src ./backend/src/

RUN npm run build --workspace shared \
 && cd backend && npx prisma generate && npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl wget tini

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# Production-only install. `--ignore-scripts` skips the shared `prepare` hook
# (tsc isn't installed in --omit=dev anyway). We copy the prebuilt dist below.
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts

# Bring in built shared + backend dist
COPY --from=builder /app/shared/dist ./shared/dist/
COPY --from=builder /app/backend/dist ./backend/dist/
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma/
COPY --from=builder /app/backend/node_modules/@prisma ./backend/node_modules/@prisma/

WORKDIR /app/backend
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
