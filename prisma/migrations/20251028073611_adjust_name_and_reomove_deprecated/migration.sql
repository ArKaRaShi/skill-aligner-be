/*
  Warnings:

  - You are about to drop the column `course_id` on the `course_learning_outcomes` table. All the data in the column will be lost.
  - You are about to drop the `clusters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `occupation_skills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `occupations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `skills` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."course_learning_outcomes" DROP CONSTRAINT "course_learning_outcomes_course_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."occupation_skills" DROP CONSTRAINT "occupation_skills_occupation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."occupation_skills" DROP CONSTRAINT "occupation_skills_skill_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."occupations" DROP CONSTRAINT "occupations_cluster_id_fkey";

-- DropIndex
DROP INDEX "public"."course_learning_outcomes_course_id_clo_no_key";

-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" DROP COLUMN "course_id";

-- DropTable
DROP TABLE "public"."clusters";

-- DropTable
DROP TABLE "public"."occupation_skills";

-- DropTable
DROP TABLE "public"."occupations";

-- DropTable
DROP TABLE "public"."skills";

-- DropEnum
DROP TYPE "public"."SkillCategory";

-- DropEnum
DROP TYPE "public"."SourceType";

-- CreateTable
CREATE TABLE "public"."course_clos" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "clo_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_clos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_clos_course_id_clo_id_key" ON "public"."course_clos"("course_id", "clo_id");

-- AddForeignKey
ALTER TABLE "public"."course_clos" ADD CONSTRAINT "course_clos_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_clos" ADD CONSTRAINT "course_clos_clo_id_fkey" FOREIGN KEY ("clo_id") REFERENCES "public"."course_learning_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
