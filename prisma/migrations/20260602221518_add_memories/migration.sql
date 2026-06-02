-- CreateTable
CREATE TABLE "Memory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "endDate" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MemoryTrip" (
    "memoryId" INTEGER NOT NULL,
    "tripId" INTEGER NOT NULL,

    PRIMARY KEY ("memoryId", "tripId"),
    CONSTRAINT "MemoryTrip_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryTrip_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TravelTrip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
