-- AlterTable User — soft-delete + 2FA columns
ALTER TABLE "User"
  ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
  ADD COLUMN "deletionAt"          TIMESTAMP(3),
  ADD COLUMN "totpSecret"          TEXT,
  ADD COLUMN "totpEnabled"         BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_deletionAt_idx" ON "User"("deletionAt");

-- CreateTable Follow
CREATE TABLE "Follow" (
  "id"          TEXT NOT NULL,
  "followerId"  TEXT NOT NULL,
  "followedId"  TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Follow_followerId_followedId_key" ON "Follow"("followerId", "followedId");
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");
CREATE INDEX "Follow_followedId_idx" ON "Follow"("followedId");
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followedId_fkey" FOREIGN KEY ("followedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ActivityEvent
CREATE TABLE "ActivityEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "profileId" TEXT,
  "kind"      TEXT NOT NULL,
  "payload"   JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable UserAchievement
CREATE TABLE "UserAchievement" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "slug"       TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserAchievement_userId_slug_key" ON "UserAchievement"("userId", "slug");
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
