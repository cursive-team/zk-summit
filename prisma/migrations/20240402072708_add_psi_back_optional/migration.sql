-- AlterTable
ALTER TABLE "User" ADD COLUMN     "psiRound1Message" TEXT,
ADD COLUMN     "wantsExperimentalFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PsiMessage" (
    "id" SERIAL NOT NULL,
    "senderEncKey" TEXT NOT NULL,
    "recipientEncKey" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PsiMessage_pkey" PRIMARY KEY ("id")
);
