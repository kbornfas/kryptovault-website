-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "verificationCode" TEXT,
    ADD COLUMN "verificationExpiresAt" TIMESTAMP(3),
    ADD COLUMN "verifiedAt" TIMESTAMP(3),
    ADD COLUMN "lastLoginAt" TIMESTAMP(3);
