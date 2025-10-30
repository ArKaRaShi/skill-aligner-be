/*
  Warnings:

  - You are about to drop the column `campus_code` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `faculty_code` on the `courses` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[academic_year,subject_code,semester]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cleaned_clo_name_th` to the `course_learning_outcomes` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."courses_campus_code_faculty_code_academic_year_subject_code_key";

-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" ADD COLUMN     "cleaned_clo_name_en" TEXT,
ADD COLUMN     "cleaned_clo_name_th" TEXT NOT NULL,
ADD COLUMN     "clo_name_en" TEXT,
ADD COLUMN     "skip_embedding" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."courses" DROP COLUMN "campus_code",
DROP COLUMN "faculty_code",
ADD COLUMN     "campus_id" UUID,
ADD COLUMN     "faculty_id" UUID,
ADD COLUMN     "is_enrollable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "subject_name_en" TEXT;

-- CreateTable
CREATE TABLE "public"."campuses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_th" TEXT,
    "name_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."faculties" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_th" TEXT,
    "name_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campuses_code_key" ON "public"."campuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_code_key" ON "public"."faculties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_academic_year_subject_code_semester_key" ON "public"."courses"("academic_year", "subject_code", "semester");

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
