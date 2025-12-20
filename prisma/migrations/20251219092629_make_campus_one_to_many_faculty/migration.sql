/*
  Warnings:

  - You are about to drop the `campus_faculties` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[campus_id,code]` on the table `faculties` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `campus_id` to the `faculties` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."campus_faculties" DROP CONSTRAINT "campus_faculties_campus_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."campus_faculties" DROP CONSTRAINT "campus_faculties_faculty_id_fkey";

-- DropIndex
DROP INDEX "public"."faculties_code_key";

-- AlterTable
ALTER TABLE "public"."faculties" ADD COLUMN     "campus_id" UUID NOT NULL;

-- DropTable
DROP TABLE "public"."campus_faculties";

-- CreateIndex
CREATE UNIQUE INDEX "faculties_campus_id_code_key" ON "public"."faculties"("campus_id", "code");

-- AddForeignKey
ALTER TABLE "public"."faculties" ADD CONSTRAINT "faculties_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
