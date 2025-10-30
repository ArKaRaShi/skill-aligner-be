/*
  Warnings:

  - You are about to drop the column `clo_name_th` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[academic_year,subject_code,semester,campus_id,faculty_id]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `original_clo_name` to the `course_learning_outcomes` table without a default value. This is not possible if the table is not empty.
  - Made the column `campus_id` on table `courses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `faculty_id` on table `courses` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."courses" DROP CONSTRAINT "courses_campus_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."courses" DROP CONSTRAINT "courses_faculty_id_fkey";

-- DropIndex
DROP INDEX "public"."courses_academic_year_subject_code_semester_key";

-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "clo_name_th",
ADD COLUMN     "cleaned_clo_name_en" TEXT,
ADD COLUMN     "original_clo_name" TEXT NOT NULL,
ADD COLUMN     "original_clo_name_en" TEXT;

-- AlterTable
ALTER TABLE "public"."courses" ALTER COLUMN "campus_id" SET NOT NULL,
ALTER COLUMN "faculty_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "courses_academic_year_subject_code_semester_campus_id_facul_key" ON "public"."courses"("academic_year", "subject_code", "semester", "campus_id", "faculty_id");

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
