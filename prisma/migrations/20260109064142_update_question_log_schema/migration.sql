/*
  Warnings:

  - You are about to drop the `QuestionLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CourseClickLog" DROP CONSTRAINT "CourseClickLog_question_id_fkey";

-- DropTable
DROP TABLE "public"."QuestionLog";

-- CreateTable
CREATE TABLE "public"."question_logs" (
    "id" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "role" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "related_process_log_id" UUID,

    CONSTRAINT "question_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_log_analyses" (
    "id" UUID NOT NULL,
    "question_log_id" UUID NOT NULL,
    "extraction_version" TEXT NOT NULL,
    "extraction_number" INTEGER NOT NULL,
    "model_used" TEXT NOT NULL,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall_quality" TEXT NOT NULL,
    "entity_counts" JSONB,
    "extraction_cost" DECIMAL(65,30) NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "reasoning" TEXT,
    "llm_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_log_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."extracted_entities" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_label" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_logs_created_at_idx" ON "public"."question_logs"("created_at");

-- CreateIndex
CREATE INDEX "question_logs_related_process_log_id_idx" ON "public"."question_logs"("related_process_log_id");

-- CreateIndex
CREATE INDEX "question_log_analyses_question_log_id_idx" ON "public"."question_log_analyses"("question_log_id");

-- CreateIndex
CREATE INDEX "question_log_analyses_extracted_at_idx" ON "public"."question_log_analyses"("extracted_at");

-- CreateIndex
CREATE INDEX "question_log_analyses_extraction_version_idx" ON "public"."question_log_analyses"("extraction_version");

-- CreateIndex
CREATE INDEX "question_log_analyses_overall_quality_idx" ON "public"."question_log_analyses"("overall_quality");

-- CreateIndex
CREATE UNIQUE INDEX "question_log_analyses_question_log_id_extraction_version_ex_key" ON "public"."question_log_analyses"("question_log_id", "extraction_version", "extraction_number");

-- CreateIndex
CREATE INDEX "extracted_entities_analysis_id_idx" ON "public"."extracted_entities"("analysis_id");

-- CreateIndex
CREATE INDEX "extracted_entities_type_idx" ON "public"."extracted_entities"("type");

-- CreateIndex
CREATE INDEX "extracted_entities_normalized_label_idx" ON "public"."extracted_entities"("normalized_label");

-- CreateIndex
CREATE INDEX "extracted_entities_confidence_idx" ON "public"."extracted_entities"("confidence");

-- CreateIndex
CREATE INDEX "extracted_entities_type_confidence_idx" ON "public"."extracted_entities"("type", "confidence");

-- CreateIndex
CREATE INDEX "extracted_entities_type_normalized_label_idx" ON "public"."extracted_entities"("type", "normalized_label");

-- AddForeignKey
ALTER TABLE "public"."CourseClickLog" ADD CONSTRAINT "CourseClickLog_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."question_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_log_analyses" ADD CONSTRAINT "question_log_analyses_question_log_id_fkey" FOREIGN KEY ("question_log_id") REFERENCES "public"."question_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."extracted_entities" ADD CONSTRAINT "extracted_entities_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."question_log_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
