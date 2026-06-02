-- CreateTable
CREATE TABLE "HomeItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "homeItemId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "intervalMonths" INTEGER,
    "dueDate" TEXT,
    "lastDoneDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceTask_homeItemId_fkey" FOREIGN KEY ("homeItemId") REFERENCES "HomeItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "homeItemId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "cost" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceLog_homeItemId_fkey" FOREIGN KEY ("homeItemId") REFERENCES "HomeItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
