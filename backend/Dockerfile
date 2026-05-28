# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY tsconfig.json nest-cli.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
RUN npx prisma generate && npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl wget tini
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund && npx prisma generate
COPY --from=builder /app/dist ./dist

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
