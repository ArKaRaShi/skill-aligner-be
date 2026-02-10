/*
  Warnings:

  - You are about to drop the column `clo_no` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - Added the required column `clo_no` to the `course_clos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."course_clos" ADD COLUMN     "clo_no" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "clo_no";
