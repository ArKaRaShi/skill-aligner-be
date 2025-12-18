/*
  Warnings:

  - You are about to drop the column `clo_id` on the `course_learning_outcome_vectors` table. All the data in the column will be lost.
  - You are about to drop the column `cleaned_clo_name_en` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - You are about to drop the column `original_clo_name_en` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - You are about to drop the column `academic_year` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `subject_name_en` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the column `subject_name_th` on the `courses` table. All the data in the column will be lost.
  - You are about to drop the `course_clos` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cleaned_clo_name]` on the table `course_learning_outcome_vectors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[course_offering_id,clo_no]` on the table `course_learning_outcomes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subject_code]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cleaned_clo_name` to the `course_learning_outcome_vectors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clo_no` to the `course_learning_outcomes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `course_offering_id` to the `course_learning_outcomes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_name` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."course_clos" DROP CONSTRAINT "course_clos_clo_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."course_clos" DROP CONSTRAINT "course_clos_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."course_learning_outcome_vectors" DROP CONSTRAINT "course_learning_outcome_vectors_clo_id_fkey";

-- DropIndex
DROP INDEX "public"."course_learning_outcome_vectors_clo_id_key";

-- DropIndex
DROP INDEX "public"."courses_academic_year_subject_code_semester_key";

-- AlterTable
ALTER TABLE "public"."course_learning_outcome_vectors" DROP COLUMN "clo_id",
ADD COLUMN     "cleaned_clo_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "cleaned_clo_name_en",
DROP COLUMN "original_clo_name_en",
ADD COLUMN     "clo_no" INTEGER NOT NULL,
ADD COLUMN     "course_offering_id" UUID NOT NULL,
ADD COLUMN     "vector_id" UUID;

-- AlterTable
ALTER TABLE "public"."courses" DROP COLUMN "academic_year",
DROP COLUMN "semester",
DROP COLUMN "subject_name_en",
DROP COLUMN "subject_name_th",
ADD COLUMN     "subject_name" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."course_clos";

-- CreateTable
CREATE TABLE "public"."course_offerings" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "semester" INTEGER NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_course_id_semester_academic_year_key" ON "public"."course_offerings"("course_id", "semester", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "course_learning_outcome_vectors_cleaned_clo_name_key" ON "public"."course_learning_outcome_vectors"("cleaned_clo_name");

-- CreateIndex
CREATE UNIQUE INDEX "course_learning_outcomes_course_offering_id_clo_no_key" ON "public"."course_learning_outcomes"("course_offering_id", "clo_no");

-- CreateIndex
CREATE UNIQUE INDEX "courses_subject_code_key" ON "public"."courses"("subject_code");

-- AddForeignKey
ALTER TABLE "public"."course_offerings" ADD CONSTRAINT "course_offerings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_learning_outcomes" ADD CONSTRAINT "course_learning_outcomes_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_learning_outcomes" ADD CONSTRAINT "course_learning_outcomes_vector_id_fkey" FOREIGN KEY ("vector_id") REFERENCES "public"."course_learning_outcome_vectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
