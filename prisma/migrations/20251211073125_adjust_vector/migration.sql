/*
  Warnings:

  - You are about to drop the column `embedding` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - You are about to drop the column `is_embedded` on the `course_learning_outcomes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "embedding",
DROP COLUMN "is_embedded",
ADD COLUMN     "has_embedding_1536" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_embedding_768" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."course_learning_outcome_vectors" (
    "id" UUID NOT NULL,
    "clo_id" UUID NOT NULL,
    "embedding_768" VECTOR(768),
    "embedding_1536" VECTOR(1536),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_learning_outcome_vectors_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."course_learning_outcome_vectors" ADD CONSTRAINT "course_learning_outcome_vectors_clo_id_fkey" FOREIGN KEY ("clo_id") REFERENCES "public"."course_learning_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
