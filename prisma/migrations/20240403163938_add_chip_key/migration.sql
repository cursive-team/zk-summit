/*
  Warnings:

  - You are about to drop the `EmailWalletMint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LocationKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LocationKey" DROP CONSTRAINT "LocationKey_locationId_fkey";

-- DropTable
DROP TABLE "EmailWalletMint";

-- DropTable
DROP TABLE "LocationKey";

-- CreateTable
CREATE TABLE "ChipKey" (
    "id" SERIAL NOT NULL,
    "chipId" TEXT NOT NULL,
    "signaturePrivateKey" TEXT NOT NULL,
    "numPreviousTaps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChipKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChipKey_chipId_key" ON "ChipKey"("chipId");
