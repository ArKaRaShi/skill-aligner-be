/*
  Warnings:

  - A unique constraint covering the columns `[course_id,clo_no]` on the table `course_learning_outcomes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[campus_code,faculty_code,academic_year,subject_code]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `clo_no` on the `course_learning_outcomes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "clo_no",
ADD COLUMN     "clo_no" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "course_learning_outcomes_course_id_clo_no_key" ON "public"."course_learning_outcomes"("course_id", "clo_no");

-- CreateIndex
CREATE UNIQUE INDEX "courses_campus_code_faculty_code_academic_year_subject_code_key" ON "public"."courses"("campus_code", "faculty_code", "academic_year", "subject_code");
