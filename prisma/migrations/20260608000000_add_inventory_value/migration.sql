-- AlterTable
ALTER TABLE "Category" ADD COLUMN "valueMethod" TEXT NOT NULL DEFAULT 'cost';
ALTER TABLE "Category" ADD COLUMN "depreciationRate" REAL;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "currentValue" REAL;
