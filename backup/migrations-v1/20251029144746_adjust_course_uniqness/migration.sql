/*
  Warnings:

  - A unique constraint covering the columns `[academic_year,subject_code,semester]` on the table `courses` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."courses_academic_year_subject_code_semester_campus_id_facul_key";

-- CreateIndex
CREATE UNIQUE INDEX "courses_academic_year_subject_code_semester_key" ON "public"."courses"("academic_year", "subject_code", "semester");
