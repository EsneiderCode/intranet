-- AlterEnum
ALTER TYPE "InventoryAction" ADD VALUE 'UNASSIGNED';

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN "location" TEXT NOT NULL DEFAULT '';
