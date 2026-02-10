/*
  Warnings:

  - You are about to drop the column `cleaned_clo_name` on the `course_learning_outcome_vectors` table. All the data in the column will be lost.
  - You are about to drop the column `course_offering_id` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[embedded_text]` on the table `course_learning_outcome_vectors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[course_id,clo_no]` on the table `course_learning_outcomes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `embedded_text` to the `course_learning_outcome_vectors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `course_id` to the `course_learning_outcomes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."course_learning_outcomes" DROP CONSTRAINT "course_learning_outcomes_course_offering_id_fkey";

-- DropIndex
DROP INDEX "public"."course_learning_outcome_vectors_cleaned_clo_name_key";

-- DropIndex
DROP INDEX "public"."course_learning_outcomes_course_offering_id_clo_no_key";

-- AlterTable
ALTER TABLE "public"."course_learning_outcome_vectors" DROP COLUMN "cleaned_clo_name",
ADD COLUMN     "embedded_text" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "course_offering_id",
DROP COLUMN "metadata",
ADD COLUMN     "course_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "campus_id_index" ON "public"."campuses"("id");

-- CreateIndex
CREATE UNIQUE INDEX "course_learning_outcome_vectors_embedded_text_key" ON "public"."course_learning_outcome_vectors"("embedded_text");

-- CreateIndex
CREATE UNIQUE INDEX "course_learning_outcomes_course_id_clo_no_key" ON "public"."course_learning_outcomes"("course_id", "clo_no");

-- CreateIndex
CREATE INDEX "faculty_id_index" ON "public"."faculties"("id");

-- AddForeignKey
ALTER TABLE "public"."course_learning_outcomes" ADD CONSTRAINT "course_learning_outcomes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
