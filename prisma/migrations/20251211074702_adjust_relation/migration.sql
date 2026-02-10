/*
  Warnings:

  - A unique constraint covering the columns `[clo_id]` on the table `course_learning_outcome_vectors` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "course_learning_outcome_vectors_clo_id_key" ON "public"."course_learning_outcome_vectors"("clo_id");
