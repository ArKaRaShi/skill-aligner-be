-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('SYNTHESIZED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "public"."SkillCategory" AS ENUM ('SOFT', 'HARD', 'UNCERTAIN');

-- AlterTable
ALTER TABLE "public"."course_learning_outcomes" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "public"."skills" (
    "id" UUID NOT NULL,
    "skill_name_en" TEXT NOT NULL,
    "skill_description_en" TEXT NOT NULL,
    "skill_category" "public"."SkillCategory" NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_type" "public"."SourceType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embeddingEn" vector(768) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."occupation_skills" (
    "id" UUID NOT NULL,
    "occupation_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupation_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."occupations" (
    "id" UUID NOT NULL,
    "occupation_name_en" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_type" "public"."SourceType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "cluster_id" UUID NOT NULL,

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clusters" (
    "id" UUID NOT NULL,
    "cluster_name" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_type" "public"."SourceType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_skill_name_en_key" ON "public"."skills"("skill_name_en");

-- CreateIndex
CREATE UNIQUE INDEX "occupation_skills_occupation_id_skill_id_key" ON "public"."occupation_skills"("occupation_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "clusters_cluster_name_key" ON "public"."clusters"("cluster_name");

-- AddForeignKey
ALTER TABLE "public"."occupation_skills" ADD CONSTRAINT "occupation_skills_occupation_id_fkey" FOREIGN KEY ("occupation_id") REFERENCES "public"."occupations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occupation_skills" ADD CONSTRAINT "occupation_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occupations" ADD CONSTRAINT "occupations_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
