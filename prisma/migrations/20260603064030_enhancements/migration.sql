-- AlterTable
ALTER TABLE "Habit" ADD COLUMN "archivedAt" DATETIME;

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN "note" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "expiryDate" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Document" ("category", "createdAt", "expiryDate", "filename", "id", "mimeType", "name", "notes", "originalName", "size") SELECT "category", "createdAt", "expiryDate", "filename", "id", "mimeType", "name", "notes", "originalName", "size" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_filename_key" ON "Document"("filename");
CREATE TABLE "new_Memory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "endDate" TEXT,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Memory" ("category", "createdAt", "date", "endDate", "id", "location", "notes", "title") SELECT "category", "createdAt", "date", "endDate", "id", "location", "notes", "title" FROM "Memory";
DROP TABLE "Memory";
ALTER TABLE "new_Memory" RENAME TO "Memory";
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "dueDate" DATETIME,
    "category" TEXT,
    "notes" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" TEXT,
    "blockedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("category", "createdAt", "done", "dueDate", "id", "notes", "priority", "title") SELECT "category", "createdAt", "done", "dueDate", "id", "notes", "priority", "title" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
