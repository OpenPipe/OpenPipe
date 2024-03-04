-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "lastUpdated" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
