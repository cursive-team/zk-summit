/*
  Warnings:

  - You are about to drop the column `foldedProofLink` on the `FoldedProof` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FoldedProof" DROP COLUMN "foldedProofLink",
ADD COLUMN     "attendeeNumFolded" INTEGER,
ADD COLUMN     "attendeeProofLink" TEXT,
ADD COLUMN     "speakerNumFolded" INTEGER,
ADD COLUMN     "speakerProofLink" TEXT,
ADD COLUMN     "talkNumFolded" INTEGER,
ADD COLUMN     "talkProofLink" TEXT;
