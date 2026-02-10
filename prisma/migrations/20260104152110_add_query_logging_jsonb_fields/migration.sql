/*
  Warnings:

  - You are about to drop the column `metadata` on the `query_process_steps` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."query_status" ADD VALUE 'EARLY_EXIT';
ALTER TYPE "public"."query_status" ADD VALUE 'TIMEOUT';

-- AlterTable
ALTER TABLE "public"."query_process_logs" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "error" JSONB,
ADD COLUMN     "input" JSONB,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "metrics" JSONB,
ADD COLUMN     "output" JSONB,
ADD COLUMN     "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."query_process_steps" DROP COLUMN "metadata",
ADD COLUMN     "embedding" JSONB,
ADD COLUMN     "error" JSONB,
ADD COLUMN     "llm" JSONB,
ADD COLUMN     "metrics" JSONB,
ALTER COLUMN "started_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "query_process_logs_status_idx" ON "public"."query_process_logs"("status");

-- CreateIndex
CREATE INDEX "query_process_logs_started_at_idx" ON "public"."query_process_logs"("started_at");

-- CreateIndex
CREATE INDEX "query_process_steps_query_log_id_idx" ON "public"."query_process_steps"("query_log_id");

-- CreateIndex
CREATE INDEX "query_process_steps_step_name_idx" ON "public"."query_process_steps"("step_name");

-- CreateIndex
CREATE INDEX "query_process_steps_started_at_idx" ON "public"."query_process_steps"("started_at");
