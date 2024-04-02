/*
  Warnings:

  - You are about to drop the column `buidlReward` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `summonId` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `minted` on the `QuestProof` table. All the data in the column will be lost.
  - You are about to drop the column `allowsAnalytics` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `claveInviteCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `claveInviteLink` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `claveWallet` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `wantsServerCustody` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `BuidlMint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemRedeemed` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[displayName]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BuidlMint" DROP CONSTRAINT "BuidlMint_userId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_questId_fkey";

-- DropForeignKey
ALTER TABLE "ItemRedeemed" DROP CONSTRAINT "ItemRedeemed_itemId_fkey";

-- DropForeignKey
ALTER TABLE "ItemRedeemed" DROP CONSTRAINT "ItemRedeemed_userId_fkey";

-- DropIndex
DROP INDEX "Quest_itemId_key";

-- DropIndex
DROP INDEX "Quest_summonId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Quest" DROP COLUMN "buidlReward",
DROP COLUMN "itemId",
DROP COLUMN "summonId";

-- AlterTable
ALTER TABLE "QuestProof" DROP COLUMN "minted";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "allowsAnalytics",
DROP COLUMN "claveInviteCode",
DROP COLUMN "claveInviteLink",
DROP COLUMN "claveWallet",
DROP COLUMN "email",
DROP COLUMN "wantsServerCustody";

-- DropTable
DROP TABLE "BuidlMint";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "ItemRedeemed";

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");
