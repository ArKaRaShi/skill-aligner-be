/*
  Warnings:

  - You are about to drop the column `cleaned_clo_name_en` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - You are about to drop the column `clo_name_en` on the `course_learning_outcomes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "cleaned_clo_name_en",
DROP COLUMN "clo_name_en";
