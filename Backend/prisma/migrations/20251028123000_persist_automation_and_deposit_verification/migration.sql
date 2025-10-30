-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('RUNNING', 'STOPPED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'AWAITING_CONFIRMATION';
ALTER TYPE "TransactionStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Transaction"
    ADD COLUMN "confirmations" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "confirmationTarget" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "confirmedAt" TIMESTAMP(3),
    ADD COLUMN "verificationNotes" TEXT,
    ADD COLUMN "verificationPayload" JSONB;

-- CreateTable
CREATE TABLE "AutomationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runsRequested" INTEGER NOT NULL,
    "runsCompleted" INTEGER NOT NULL DEFAULT 0,
    "currencies" TEXT[] NOT NULL,
    "stakePerRun" DECIMAL(65,30) NOT NULL,
    "strategyPreset" TEXT,
    "status" "AutomationStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AutomationSession"
    ADD CONSTRAINT "AutomationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
