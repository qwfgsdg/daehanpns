-- CreateEnum
CREATE TYPE "JoinType" AS ENUM ('FREE', 'APPROVAL');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN "joinType" "JoinType" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN "status" "ParticipantStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "ChatParticipant_status_idx" ON "ChatParticipant"("status");
