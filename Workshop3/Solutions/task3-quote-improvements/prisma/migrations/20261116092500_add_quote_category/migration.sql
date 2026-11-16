-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "category" VARCHAR(50);

-- CreateIndex
CREATE INDEX "Quote_category_idx" ON "Quote"("category");
