/*
  Warnings:

  - You are about to drop the column `questionText` on the `question_logs` table. All the data in the column will be lost.
  - Added the required column `question_text` to the `question_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."question_logs" DROP COLUMN "questionText",
ADD COLUMN     "question_text" TEXT NOT NULL;
