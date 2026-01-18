-- AlterTable
ALTER TABLE "public"."query_process_logs" ADD COLUMN     "total_cost" DECIMAL(10,6),
ADD COLUMN     "total_duration" INTEGER,
ADD COLUMN     "total_tokens" INTEGER;

-- CreateIndex
CREATE INDEX "query_process_logs_total_cost_idx" ON "public"."query_process_logs"("total_cost");

-- CreateIndex
CREATE INDEX "query_process_logs_total_duration_idx" ON "public"."query_process_logs"("total_duration");

-- CreateIndex
CREATE INDEX "query_process_logs_total_tokens_idx" ON "public"."query_process_logs"("total_tokens");
