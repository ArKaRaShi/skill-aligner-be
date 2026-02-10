/*
  Warnings:

  - A unique constraint covering the columns `[campus_code,faculty_code,academic_year,subject_code,semester]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `semester` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."courses_campus_code_faculty_code_academic_year_subject_code_key";

-- AlterTable
ALTER TABLE "public"."courses" ADD COLUMN     "semester" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "courses_campus_code_faculty_code_academic_year_subject_code_key" ON "public"."courses"("campus_code", "faculty_code", "academic_year", "subject_code", "semester");
