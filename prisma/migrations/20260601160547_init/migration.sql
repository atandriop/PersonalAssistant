-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "cost" REAL NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "notes" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" DATETIME,
    "notes" TEXT,
    "categoryId" INTEGER NOT NULL,
    "upgradeTargetId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_upgradeTargetId_fkey" FOREIGN KEY ("upgradeTargetId") REFERENCES "WishlistItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Matrix" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MatrixCriteria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "matrixId" INTEGER NOT NULL,
    CONSTRAINT "MatrixCriteria_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatrixOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "matrixId" INTEGER NOT NULL,
    CONSTRAINT "MatrixOption_matrixId_fkey" FOREIGN KEY ("matrixId") REFERENCES "Matrix" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatrixScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "score" REAL NOT NULL DEFAULT 0,
    "optionId" INTEGER NOT NULL,
    "criteriaId" INTEGER NOT NULL,
    CONSTRAINT "MatrixScore_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "MatrixOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatrixScore_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "MatrixCriteria" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioHolding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL,
    "buyPrice" REAL,
    "currentPrice" REAL,
    "balance" REAL,
    "interestRate" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wishlistTotal" REAL NOT NULL,
    "portfolioTotal" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MatrixScore_optionId_criteriaId_key" ON "MatrixScore"("optionId", "criteriaId");
