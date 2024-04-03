/*
  Warnings:

  - Added the required column `signaturePublicKey` to the `ChipKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChipKey" ADD COLUMN     "signaturePublicKey" TEXT NOT NULL;
