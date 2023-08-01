-- CreateTable
CREATE TABLE "WorldChampEntrant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldChampEntrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorldChampEntrant_userId_key" ON "WorldChampEntrant"("userId");

-- AddForeignKey
ALTER TABLE "WorldChampEntrant" ADD CONSTRAINT "WorldChampEntrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
