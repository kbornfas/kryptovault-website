ALTER TABLE "User"
ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3),
ADD COLUMN "passwordResetAttempts" INTEGER NOT NULL DEFAULT 0;
