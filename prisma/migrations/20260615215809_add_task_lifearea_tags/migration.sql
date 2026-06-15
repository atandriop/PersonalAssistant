-- AlterTable
ALTER TABLE "Task" ADD COLUMN "lifeAreaId" INTEGER;
ALTER TABLE "Task" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';

-- Add foreign key constraint
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "dueDate" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" TEXT,
    "blockedById" INTEGER,
    "lifeAreaId" INTEGER,
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_lifeAreaId_fkey" FOREIGN KEY ("lifeAreaId") REFERENCES "LifeArea" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("id", "title", "priority", "dueDate", "category", "notes", "done", "recurring", "recurringInterval", "blockedById", "lifeAreaId", "tags", "createdAt") SELECT "id", "title", "priority", "dueDate", "category", "notes", "done", "recurring", "recurringInterval", "blockedById", "lifeAreaId", "tags", "createdAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
