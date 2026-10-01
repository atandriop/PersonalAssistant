-- Snapshot.date: DateTime -> String (YYYY-MM-DD), de-duplicated, unique per day.
--
-- POST /api/snapshots used create() where its sibling net-worth route used
-- upsert(), guarded only by sessionStorage, so every new tab on the same day
-- inserted another row (14 rows existed for 2026-08-13). Those became duplicate
-- points in two charts on the Net Worth page.
--
-- Prisma stores SQLite DateTime as ISO-8601 TEXT, so the day is extracted with
-- date(..., 'localtime') to match the local calendar day the app records
-- everywhere else. The highest id per day survives, being the most recent state.
CREATE TABLE "new_Snapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "wishlistTotal" REAL NOT NULL,
    "portfolioTotal" REAL NOT NULL
);

INSERT INTO "new_Snapshot" ("id", "date", "wishlistTotal", "portfolioTotal")
SELECT s."id", date(s."date", 'localtime'), s."wishlistTotal", s."portfolioTotal"
FROM "Snapshot" s
WHERE s."id" = (
    SELECT MAX(s2."id") FROM "Snapshot" s2
    WHERE date(s2."date", 'localtime') = date(s."date", 'localtime')
);

DROP TABLE "Snapshot";
ALTER TABLE "new_Snapshot" RENAME TO "Snapshot";
CREATE UNIQUE INDEX "Snapshot_date_key" ON "Snapshot"("date");

-- Subscription.renewalDate: DateTime -> String (YYYY-MM-DD).
--
-- This was the only user-entered date in the schema stored as DateTime; every
-- other one (Appointment.date, Memory.date, NetWorthSnapshot.date, ...) is a
-- YYYY-MM-DD string. It serialised as a full ISO string, so CalendarPage's
-- `new Date(s.renewalDate + 'T00:00:00')` produced an Invalid Date and
-- subscription renewals never appeared on the calendar at all.
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "period" TEXT NOT NULL,
    "renewalDate" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Subscription" ("id", "name", "cost", "period", "renewalDate", "url", "notes", "active", "category", "createdAt")
SELECT "id", "name", "cost", "period",
       CASE WHEN "renewalDate" IS NULL THEN NULL ELSE substr("renewalDate", 1, 10) END,
       "url", "notes", "active", "category", "createdAt"
FROM "Subscription";

DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
