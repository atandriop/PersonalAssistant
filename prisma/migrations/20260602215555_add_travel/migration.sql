-- CreateTable
CREATE TABLE "TravelCountry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TravelTrip" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "countryId" INTEGER NOT NULL,
    "cities" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "actualCost" REAL,
    "rating" INTEGER,
    "notes" TEXT,
    "bucketTripId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelTrip_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "TravelCountry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TravelCountry_name_key" ON "TravelCountry"("name");
