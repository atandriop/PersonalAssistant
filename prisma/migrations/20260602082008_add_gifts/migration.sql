-- CreateTable
CREATE TABLE "GiftPerson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "budget" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GiftIdea" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "giftPersonId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "occasion" TEXT,
    "estimatedCost" REAL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiftIdea_giftPersonId_fkey" FOREIGN KEY ("giftPersonId") REFERENCES "GiftPerson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
