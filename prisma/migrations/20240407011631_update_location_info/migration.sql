/*
  Warnings:

  - You are about to drop the column `displayEmailWalletLink` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `sponsor` on the `Location` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `speaker` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stage` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Location" DROP COLUMN "displayEmailWalletLink",
DROP COLUMN "imageUrl",
DROP COLUMN "sponsor",
ADD COLUMN     "endTime" TEXT NOT NULL,
ADD COLUMN     "speaker" TEXT NOT NULL,
ADD COLUMN     "stage" TEXT NOT NULL,
ADD COLUMN     "startTime" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isUserSpeaker" BOOLEAN NOT NULL DEFAULT false;
