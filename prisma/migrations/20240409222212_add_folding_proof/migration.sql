-- CreateTable
CREATE TABLE "FoldedProof" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "foldedProofLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoldedProof_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FoldedProof" ADD CONSTRAINT "FoldedProof_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
