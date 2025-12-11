-- CreateEnum
CREATE TYPE "public"."query_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."query_process_logs" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "status" "public"."query_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_process_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."query_process_steps" (
    "id" UUID NOT NULL,
    "query_log_id" UUID NOT NULL,
    "step_name" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "input" JSONB,
    "output" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_process_steps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."query_process_steps" ADD CONSTRAINT "query_process_steps_query_log_id_fkey" FOREIGN KEY ("query_log_id") REFERENCES "public"."query_process_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
