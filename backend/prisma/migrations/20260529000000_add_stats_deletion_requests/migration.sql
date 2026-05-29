-- CreateEnum
CREATE TYPE "DeletionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "StatsDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "DeletionStatus" NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatsDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatsDeletionRequest_status_createdAt_idx" ON "StatsDeletionRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StatsDeletionRequest_userId_idx" ON "StatsDeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "StatsDeletionRequest_profileId_idx" ON "StatsDeletionRequest"("profileId");

-- AddForeignKey
ALTER TABLE "StatsDeletionRequest" ADD CONSTRAINT "StatsDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatsDeletionRequest" ADD CONSTRAINT "StatsDeletionRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatsDeletionRequest" ADD CONSTRAINT "StatsDeletionRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TrackedProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
